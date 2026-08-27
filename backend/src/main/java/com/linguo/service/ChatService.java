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
                .translatedText(null)
                .status("draft")
                .build();

        redisPubSubService.publish(roomIdStr, immediateDraft);

        // Trigger background translation via the Spring proxy so @Async works
        self.processTranslationAsync(msg.getId());
    }

    @Async
    @Transactional
    public void processTranslationAsync(UUID messageId) {
        try {
            Message msg = messageRepository.findById(messageId).orElse(null);
            if (msg == null) {
                return;
            }

            ChatRoom room = msg.getRoom();
            User sender = msg.getSender();
            String roomIdStr = room.getId().toString();

            ChatParticipant participant = participantRepository
                    .findByRoomIdAndUserId(room.getId(), sender.getId())
                    .orElse(null);

            String detCode = translationService.normLang(languageDetectionService.detectLanguage(msg.getOriginalText()));
            String srcCode = translationService.normLang(room.getSourceLang());
            String tgtCode = translationService.normLang(room.getTargetLang());
            String myCode = participant != null ? translationService.normLang(participant.getLanguage()) : null;
            String prefCode = translationService.normLang(sender.getPreferredLanguage());
            Set<String> pair = Set.of(srcCode != null ? srcCode : "en", tgtCode != null ? tgtCode : "es");

            // Pick source language
            String actualSource;
            if (detCode != null && pair.contains(detCode)) {
                actualSource = detCode;
            } else if (myCode != null && pair.contains(myCode)) {
                actualSource = myCode;
            } else if (prefCode != null && pair.contains(prefCode)) {
                actualSource = prefCode;
            } else {
                actualSource = detCode != null ? detCode : "en";
            }

            // Target language is the opposite
            String actualTarget;
            if (pair.contains(actualSource)) {
                actualTarget = actualSource.equals(srcCode) ? tgtCode : srcCode;
            } else {
                actualTarget = tgtCode;
            }

            msg.setDetectedLang(detCode);

            // Step 1: Translate
            String translated = translationService.translateText(msg.getOriginalText(), actualSource, actualTarget);
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

        } catch (Exception e) {
            log.error("processTranslationAsync failed for message {}", messageId, e);
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
