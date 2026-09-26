package com.mosaic.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(name = "original_text", columnDefinition = "TEXT")
    private String originalText;

    @Column(name = "translated_text", columnDefinition = "TEXT")
    private String translatedText;

    @Column(name = "detected_lang")
    private String detectedLang;

    @Column(name = "message_type", nullable = false)
    private String messageType = "text"; // "text" | "image" | "file"

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(nullable = false)
    private String status = "draft"; // "draft" | "final"

    @Column(name = "cultural_footnotes", columnDefinition = "TEXT")
    private String culturalFootnotes;

    // JSON object mapping each listener seat language to its translation, e.g. {"es":"...","fr":"..."}
    @Column(name = "translations", columnDefinition = "TEXT")
    private String translations;

    @Column(name = "tts_url")
    private String ttsUrl;

    @Column(name = "reply_to_id")
    private UUID replyToId;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "attachment_name")
    private String attachmentName;

    @Column(name = "attachment_size")
    private Long attachmentSize;

    @Column(name = "delivery_status")
    private String deliveryStatus = "read"; // "sent" | "delivered" | "read"

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Message() {}

    public Message(UUID id, ChatRoom room, User sender, String originalText, String translatedText,
                   String detectedLang, String messageType, String audioUrl, String status,
                   String culturalFootnotes, String translations, String ttsUrl,
                   UUID replyToId, String attachmentUrl, String attachmentName, Long attachmentSize,
                   String deliveryStatus, Instant createdAt) {
        this.id = id;
        this.room = room;
        this.sender = sender;
        this.originalText = originalText;
        this.translatedText = translatedText;
        this.detectedLang = detectedLang;
        this.messageType = messageType != null ? messageType : "text";
        this.audioUrl = audioUrl;
        this.status = status != null ? status : "draft";
        this.culturalFootnotes = culturalFootnotes;
        this.translations = translations;
        this.ttsUrl = ttsUrl;
        this.replyToId = replyToId;
        this.attachmentUrl = attachmentUrl;
        this.attachmentName = attachmentName;
        this.attachmentSize = attachmentSize;
        this.deliveryStatus = deliveryStatus != null ? deliveryStatus : "read";
        this.createdAt = createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private ChatRoom room;
        private User sender;
        private String originalText;
        private String translatedText;
        private String detectedLang;
        private String messageType = "text";
        private String audioUrl;
        private String status = "draft";
        private String culturalFootnotes;
        private String translations;
        private String ttsUrl;
        private UUID replyToId;
        private String attachmentUrl;
        private String attachmentName;
        private Long attachmentSize;
        private String deliveryStatus = "read";
        private Instant createdAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder room(ChatRoom room) { this.room = room; return this; }
        public Builder sender(User sender) { this.sender = sender; return this; }
        public Builder originalText(String originalText) { this.originalText = originalText; return this; }
        public Builder translatedText(String translatedText) { this.translatedText = translatedText; return this; }
        public Builder detectedLang(String detectedLang) { this.detectedLang = detectedLang; return this; }
        public Builder messageType(String messageType) { this.messageType = messageType; return this; }
        public Builder audioUrl(String audioUrl) { this.audioUrl = audioUrl; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder culturalFootnotes(String culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; return this; }
        public Builder translations(String translations) { this.translations = translations; return this; }
        public Builder ttsUrl(String ttsUrl) { this.ttsUrl = ttsUrl; return this; }
        public Builder replyToId(UUID replyToId) { this.replyToId = replyToId; return this; }
        public Builder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }
        public Builder attachmentName(String attachmentName) { this.attachmentName = attachmentName; return this; }
        public Builder attachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; return this; }
        public Builder deliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public Message build() {
            return new Message(id, room, sender, originalText, translatedText, detectedLang, messageType, audioUrl, status, culturalFootnotes, translations, ttsUrl, replyToId, attachmentUrl, attachmentName, attachmentSize, deliveryStatus, createdAt);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public ChatRoom getRoom() { return room; }
    public void setRoom(ChatRoom room) { this.room = room; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getOriginalText() { return originalText; }
    public void setOriginalText(String originalText) { this.originalText = originalText; }
    public String getTranslatedText() { return translatedText; }
    public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }
    public String getDetectedLang() { return detectedLang; }
    public void setDetectedLang(String detectedLang) { this.detectedLang = detectedLang; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCulturalFootnotes() { return culturalFootnotes; }
    public void setCulturalFootnotes(String culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; }
    public String getTranslations() { return translations; }
    public void setTranslations(String translations) { this.translations = translations; }
    public String getTtsUrl() { return ttsUrl; }
    public void setTtsUrl(String ttsUrl) { this.ttsUrl = ttsUrl; }
    public UUID getReplyToId() { return replyToId; }
    public void setReplyToId(UUID replyToId) { this.replyToId = replyToId; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }
    public String getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
