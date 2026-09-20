package com.mosaic.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mosaic.model.dto.CulturalFootnotes;
import com.mosaic.model.dto.WsOutgoingMessage;
import com.mosaic.model.entity.ChatParticipant;
import com.mosaic.model.entity.ChatRoom;
import com.mosaic.model.entity.Message;
import com.mosaic.model.entity.User;
import com.mosaic.repository.ChatParticipantRepository;
import com.mosaic.repository.ChatRoomRepository;
import com.mosaic.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final MessageRepository messageRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatParticipantRepository participantRepository;
    private final TranslationService translationService;
    private final TranslationCacheService translationCacheService;
    private final LanguageDetectionService languageDetectionService;
    private final RedisPubSubService redisPubSubService;
    private final ObjectMapper objectMapper;
    private final ChatService self;

    public ChatService(MessageRepository messageRepository,
                       ChatRoomRepository roomRepository,
                       ChatParticipantRepository participantRepository,
                       TranslationService translationService,
                       TranslationCacheService translationCacheService,
                       LanguageDetectionService languageDetectionService,
                       RedisPubSubService redisPubSubService,
                       ObjectMapper objectMapper,
                       @Lazy ChatService self) {
        this.messageRepository = messageRepository;
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.translationService = translationService;
        this.translationCacheService = translationCacheService;
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

    private String translateWithCache(String text, String src, String dst) {
        String cached = translationCacheService.get(text, src, dst);
        if (cached != null && !cached.isBlank()) {
            return cached;
        }
        String translated = translationService.translateText(text, src, dst);
        if (translated != null && !translated.isBlank() && !translated.startsWith("[translation unavailable]")) {
            translationCacheService.put(text, src, dst, translated);
        }
        return translated;
    }

    @Async
    @Transactional
    public void processTranslationAsync(UUID messageId) {
        try {
            Message msg = null;
            for (int i = 0; i < 3; i++) {
                msg = messageRepository.findById(messageId).orElse(null);
                if (msg != null) break;
                Thread.sleep(50);
            }

            if (msg == null) {
                log.warn("Message {} not found for async translation", messageId);
                return;
            }

            if ("final".equals(messageRepository.findStatusById(messageId).orElse(null))) {
                log.info("Message {} already finalized before translation started; skipping", messageId);
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

            // 2. Determine Recipient Target Language(s) across all distinct participants
            List<ChatParticipant> allParticipants = participantRepository.findAllByRoomId(room.getId());
            List<String> listenerLangs = allParticipants.stream()
                    .filter(p -> !p.getUser().getId().equals(sender.getId()))
                    .map(p -> translationService.normLang(p.getLanguage()))
                    .filter(lang -> lang != null && TranslationService.LANG_MAP.containsKey(lang))
                    .distinct()
                    .toList();

            String actualTarget;
            if (!listenerLangs.isEmpty()) {
                actualTarget = listenerLangs.get(0);
            } else {
                if (prefCode != null && !prefCode.equals(actualSource)) {
                    actualTarget = prefCode;
                } else if ("en".equals(actualSource)) {
                    actualTarget = "es";
                } else {
                    actualTarget = "en";
                }
            }

            String original = msg.getOriginalText();

            // Step 1: Translate for primary recipient (cached)
            String translated = translateWithCache(original, actualSource, actualTarget);
            if (translated == null || translated.isBlank()) {
                translated = original;
            }

            // Step 2: Translate in parallel for every distinct listener language in the room
            Map<String, String> translations = new ConcurrentHashMap<>();
            if (!listenerLangs.isEmpty()) {
                translations.put(actualTarget, translated);
                List<Thread> extraLangJobs = new ArrayList<>();
                for (String lang : listenerLangs) {
                    if (lang.equals(actualTarget)) continue;
                    extraLangJobs.add(Thread.ofVirtual().start(() -> {
                        String perLang = translateWithCache(original, actualSource, lang);
                        if (perLang != null && !perLang.isBlank()) {
                            translations.put(lang, perLang);
                        }
                    }));
                }
                for (Thread job : extraLangJobs) {
                    job.join();
                }
            }
            String translationsJson = translations.isEmpty() ? null : objectMapper.writeValueAsString(translations);

            // Step 3: Apply atomically while still draft
            int updated = messageRepository.applyTranslationIfDraft(
                    messageId, translated, detCode != null ? detCode : actualSource, translationsJson);
            if (updated == 0) {
                log.info("Message {} was finalized during translation; discarding AI result", messageId);
                return;
            }

            WsOutgoingMessage translatedDraft = WsOutgoingMessage.builder()
                    .type("draft_ready")
                    .id(messageId.toString())
                    .senderEmail(sender.getEmail())
                    .originalText(original)
                    .text(original)
                    .translatedText(translated)
                    .detectedLang(detCode)
                    .translations(translations.isEmpty() ? null : translations)
                    .status("draft")
                    .build();

            redisPubSubService.publish(roomIdStr, translatedDraft);

            // Step 4: Cultural footnotes analysis
            try {
                CulturalFootnotes footnotes = translationService.getCulturalFootnotes(
                        original,
                        translated,
                        actualTarget
                );

                if (footnotes != null) {
                    int footnotesUpdated = messageRepository.applyFootnotesIfDraft(
                            messageId, objectMapper.writeValueAsString(footnotes));
                    if (footnotesUpdated == 0) {
                        return;
                    }

                    WsOutgoingMessage footnotesDraft = WsOutgoingMessage.builder()
                            .type("draft_ready")
                            .id(messageId.toString())
                            .senderEmail(sender.getEmail())
                            .originalText(original)
                            .text(original)
                            .translatedText(translated)
                            .detectedLang(detCode)
                            .culturalFootnotes(footnotes)
                            .translations(translations.isEmpty() ? null : translations)
                            .status("draft")
                            .build();

                    redisPubSubService.publish(roomIdStr, footnotesDraft);
                }
            } catch (Exception fnEx) {
                log.warn("Cultural footnotes analysis failed for message {}: {}", messageId, fnEx.getMessage());
            }

        } catch (Exception e) {
            log.error("processTranslationAsync failed for message {}", messageId, e);
            try {
                Message fallbackMsg = messageRepository.findById(messageId).orElse(null);
                if (fallbackMsg != null) {
                    int updated = messageRepository.applyTranslationIfDraft(
                            messageId, fallbackMsg.getOriginalText(), fallbackMsg.getDetectedLang(), null);
                    if (updated == 0) {
                        return;
                    }

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

        Map<String, String> parsedTranslations = null;
        if (msg.getTranslations() != null && !msg.getTranslations().isBlank()) {
            try {
                parsedTranslations = objectMapper.readValue(msg.getTranslations(), new TypeReference<Map<String, String>>() {});
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
                .translations(parsedTranslations)
                .status("final")
                .ttsUrl(msg.getTtsUrl())
                .audioUrl(msg.getAudioUrl())
                .build();

        redisPubSubService.publish(roomIdStr, finalizedMsg);
        log.info("Published finalized message: {}", msg.getId());
    }
}
