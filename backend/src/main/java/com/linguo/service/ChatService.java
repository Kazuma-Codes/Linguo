package com.linguo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguo.model.dto.CulturalFootnotes;
import com.linguo.model.dto.WsOutgoingMessage;
import com.linguo.model.entity.ChatParticipant;
import com.linguo.model.entity.ChatRoom;
import com.linguo.model.entity.Message;
import com.linguo.model.entity.User;
import com.linguo.repository.ChatParticipantRepository;
import com.linguo.repository.ChatRoomRepository;
import com.linguo.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final MessageRepository messageRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatParticipantRepository participantRepository;
    private final TranslationService translationService;
    private final LanguageDetectionService languageDetectionService;
    private final RedisPubSubService redisPubSubService;
    private final ObjectMapper objectMapper;
    private final ChatService self;

    public ChatService(MessageRepository messageRepository,
                       ChatRoomRepository roomRepository,
                       ChatParticipantRepository participantRepository,
                       TranslationService translationService,
                       LanguageDetectionService languageDetectionService,
                       RedisPubSubService redisPubSubService,
                       ObjectMapper objectMapper,
                       @Lazy ChatService self) {
        this.messageRepository = messageRepository;
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.translationService = translationService;
        this.languageDetectionService = languageDetectionService;
        this.redisPubSubService = redisPubSubService;
        this.objectMapper = objectMapper;
        this.self = self;
    }

    @Transactional
    public void handleSendDraft(String roomIdStr, String text, User sender) {
        if (text == null || text.isBlank()) {
            return;
        }

        UUID roomId = UUID.fromString(roomIdStr);
        ChatRoom room = roomRepository.findById(roomId).orElse(null);
        if (room == null) {
            return;
        }

        Message msg = Message.builder()
                .room(room)
                .sender(sender)
                .originalText(text)
                .detectedLang("pending")
                .status("draft")
                .messageType("text")
                .build();

        msg = messageRepository.save(msg);

        // Immediate broadcast that draft was received
        WsOutgoingMessage immediateDraft = WsOutgoingMessage.builder()
                .type("draft_ready")
                .id(msg.getId().toString())
                .senderEmail(sender.getEmail())
                .text(text)
                .originalText(text)
                .translatedText(null)
                .status("draft")
                .build();

        redisPubSubService.publish(roomIdStr, immediateDraft);

        final UUID msgId = msg.getId();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    self.processTranslationAsync(msgId);
                }
            });
        } else {
            self.processTranslationAsync(msgId);
        }
    }

    @Transactional
    public void handleDirectSend(String roomIdStr, String text, User sender) {
        if (text == null || text.isBlank()) {
            return;
        }

        UUID roomId = UUID.fromString(roomIdStr);
        ChatRoom room = roomRepository.findById(roomId).orElse(null);
        if (room == null) {
            return;
        }

        String detectedRaw = languageDetectionService.detectLanguage(text);
        String detCode = detectedRaw != null ? translationService.normLang(detectedRaw) : null;

        Message msg = Message.builder()
                .room(room)
                .sender(sender)
                .originalText(text)
                .translatedText(text)
                .detectedLang(detCode)
                .status("final")
                .messageType("text")
                .build();

        msg = messageRepository.saveAndFlush(msg);

        WsOutgoingMessage finalizedMsg = WsOutgoingMessage.builder()
                .type("message_finalized")
                .id(msg.getId().toString())
                .senderEmail(sender.getEmail())
                .originalText(text)
                .text(text)
                .translatedText(null)
                .detectedLang(detCode)
                .status("final")
                .build();

        redisPubSubService.publish(roomIdStr, finalizedMsg);
        log.info("Direct message finalized immediately: {}", msg.getId());
    }

    @Async
    @Transactional
    public void processTranslationAsync(UUID messageId) {
        try {
            Message msg = null;
            // Short retry loop in case database read lags behind commit
            for (int i = 0; i < 3; i++) {
                msg = messageRepository.findById(messageId).orElse(null);
                if (msg != null) break;
                Thread.sleep(50);
            }

            if (msg == null) {
                log.warn("Message {} not found for async translation", messageId);
                return;
            }

            ChatRoom room = msg.getRoom();
            User sender = msg.getSender();
            String roomIdStr = room.getId().toString();

            ChatParticipant participant = participantRepository
                    .findByRoomIdAndUserId(room.getId(), sender.getId())
                    .orElse(null);

            String detectedRaw = languageDetectionService.detectLanguage(msg.getOriginalText());
            String detCode = detectedRaw != null ? translationService.normLang(detectedRaw) : null;
            String myCode = participant != null ? translationService.normLang(participant.getLanguage()) : null;
            String prefCode = translationService.normLang(sender.getPreferredLanguage());

            // 1. Determine Sender Source Language
            String actualSource;
            if (myCode != null && TranslationService.LANG_MAP.containsKey(myCode)) {
                if (detCode != null && !detCode.equals(myCode) && !detCode.equals("en")) {
                    actualSource = detCode;
                } else {
                    actualSource = myCode;
                }
            } else if (detCode != null && TranslationService.LANG_MAP.containsKey(detCode)) {
                actualSource = detCode;
            } else if (prefCode != null && TranslationService.LANG_MAP.containsKey(prefCode)) {
                actualSource = prefCode;
            } else {
                actualSource = "en";
            }

            // 2. Determine Recipient Target Language(s)
            List<ChatParticipant> allParticipants = participantRepository.findAllByRoomId(room.getId());
            List<String> listenerLangs = allParticipants.stream()
                    .filter(p -> !p.getUser().getId().equals(sender.getId()))
                    .map(p -> translationService.normLang(p.getLanguage()))
                    .filter(lang -> lang != null && TranslationService.LANG_MAP.containsKey(lang))
                    .distinct()
                    .toList();

            String actualTarget;
            if (!listenerLangs.isEmpty()) {
                // If there are other participants, translate to the recipient's language
                actualTarget = listenerLangs.get(0);
            } else {
                // When user is alone in the room, fallback to the user's own preferred language
                if (prefCode != null && !prefCode.equals(actualSource)) {
                    actualTarget = prefCode;
                } else if ("en".equals(actualSource)) {
                    actualTarget = "es";
                } else {
                    actualTarget = "en";
                }
            }

            msg.setDetectedLang(detCode != null ? detCode : actualSource);

            // Step 1: Translate
            String translated = translationService.translateText(msg.getOriginalText(), actualSource, actualTarget);
            if (translated == null || translated.isBlank()) {
                translated = msg.getOriginalText();
            }
            msg.setTranslatedText(translated);
            msg = messageRepository.saveAndFlush(msg);

            WsOutgoingMessage translatedDraft = WsOutgoingMessage.builder()
                    .type("draft_ready")
                    .id(msg.getId().toString())
                    .senderEmail(sender.getEmail())
                    .originalText(msg.getOriginalText())
                    .text(msg.getOriginalText())
                    .translatedText(translated)
                    .detectedLang(detCode)
                    .status("draft")
                    .build();

            redisPubSubService.publish(roomIdStr, translatedDraft);

            // Step 2: Cultural footnotes
            try {
                CulturalFootnotes footnotes = translationService.getCulturalFootnotes(
                        msg.getOriginalText(),
                        translated,
                        actualTarget
                );

                if (footnotes != null) {
                    msg.setCulturalFootnotes(objectMapper.writeValueAsString(footnotes));
                    messageRepository.saveAndFlush(msg);

                    WsOutgoingMessage footnotesDraft = WsOutgoingMessage.builder()
                            .type("draft_ready")
                            .id(msg.getId().toString())
                            .senderEmail(sender.getEmail())
                            .originalText(msg.getOriginalText())
                            .text(msg.getOriginalText())
                            .translatedText(translated)
                            .detectedLang(detCode)
                            .culturalFootnotes(footnotes)
                            .status("draft")
                            .build();

                    redisPubSubService.publish(roomIdStr, footnotesDraft);
                }
            } catch (Exception fnEx) {
                log.warn("Cultural footnotes analysis failed for message {}: {}", messageId, fnEx.getMessage());
            }

        } catch (Exception e) {
            log.error("processTranslationAsync failed for message {}", messageId, e);
            // Broadcast fallback to ensure client draft is never stuck waiting indefinitely
            try {
                Message fallbackMsg = messageRepository.findById(messageId).orElse(null);
                if (fallbackMsg != null) {
                    fallbackMsg.setTranslatedText(fallbackMsg.getOriginalText());
                    messageRepository.saveAndFlush(fallbackMsg);

                    WsOutgoingMessage fallbackDraft = WsOutgoingMessage.builder()
                            .type("draft_ready")
                            .id(fallbackMsg.getId().toString())
                            .senderEmail(fallbackMsg.getSender().getEmail())
                            .originalText(fallbackMsg.getOriginalText())
                            .text(fallbackMsg.getOriginalText())
                            .translatedText(fallbackMsg.getOriginalText())
                            .status("draft")
                            .build();
                    redisPubSubService.publish(fallbackMsg.getRoom().getId().toString(), fallbackDraft);
                }
            } catch (Exception ignored) {
            }
        }
    }

    @Transactional
    public void handleConfirmDraft(String roomIdStr, String msgIdStr, String editedText, User sender) {
        if (msgIdStr == null || msgIdStr.isBlank()) {
            return;
        }

        UUID roomId = UUID.fromString(roomIdStr);
        UUID msgId = UUID.fromString(msgIdStr);

        Message msg = messageRepository.findByIdAndRoomId(msgId, roomId).orElse(null);
        if (msg == null || !msg.getSender().getId().equals(sender.getId())) {
            return;
        }

        if (editedText != null && !editedText.isBlank()) {
            msg.setTranslatedText(editedText);
        }
        msg.setStatus("final");
        messageRepository.saveAndFlush(msg);

        Object parsedFootnotes = null;
        if (msg.getCulturalFootnotes() != null && !msg.getCulturalFootnotes().isBlank()) {
            try {
                parsedFootnotes = objectMapper.readValue(msg.getCulturalFootnotes(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {
            }
        }

        WsOutgoingMessage finalizedMsg = WsOutgoingMessage.builder()
                .type("message_finalized")
                .id(msg.getId().toString())
                .senderEmail(sender.getEmail())
                .originalText(msg.getOriginalText())
                .text(msg.getOriginalText())
                .translatedText(msg.getTranslatedText())
                .detectedLang(msg.getDetectedLang())
                .culturalFootnotes(parsedFootnotes)
                .status("final")
                .ttsUrl(msg.getTtsUrl())
                .audioUrl(msg.getAudioUrl())
                .build();

        redisPubSubService.publish(roomIdStr, finalizedMsg);
        log.info("Published finalized message: {}", msg.getId());
    }
}
