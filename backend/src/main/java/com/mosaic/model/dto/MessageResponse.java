package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class MessageResponse {

    private UUID id;

    @JsonProperty("room_id")
    private UUID roomId;

    @JsonProperty("sender_id")
    private UUID senderId;

    @JsonProperty("sender_email")
    private String senderEmail;

    @JsonProperty("sender_username")
    private String senderUsername;

    @JsonProperty("sender_avatar_url")
    private String senderAvatarUrl;

    @JsonProperty("original_text")
    private String originalText;

    @JsonProperty("translated_text")
    private String translatedText;

    @JsonProperty("detected_lang")
    private String detectedLang;

    private Map<String, String> translations;

    @JsonProperty("cultural_footnotes")
    private Object culturalFootnotes;

    @JsonProperty("message_type")
    private String messageType;

    @JsonProperty("reply_to_id")
    private UUID replyToId;

    @JsonProperty("attachment_url")
    private String attachmentUrl;

    @JsonProperty("attachment_name")
    private String attachmentName;

    @JsonProperty("attachment_size")
    private Long attachmentSize;

    @JsonProperty("delivery_status")
    private String deliveryStatus;

    private String status;

    @JsonProperty("is_me")
    private boolean isMe;

    @JsonProperty("created_at")
    private Instant createdAt;

    public MessageResponse() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID roomId;
        private UUID senderId;
        private String senderEmail;
        private String senderUsername;
        private String senderAvatarUrl;
        private String originalText;
        private String translatedText;
        private String detectedLang;
        private Map<String, String> translations;
        private Object culturalFootnotes;
        private String messageType = "text";
        private UUID replyToId;
        private String attachmentUrl;
        private String attachmentName;
        private Long attachmentSize;
        private String deliveryStatus = "read";
        private String status = "final";
        private boolean isMe;
        private Instant createdAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder roomId(UUID roomId) { this.roomId = roomId; return this; }
        public Builder senderId(UUID senderId) { this.senderId = senderId; return this; }
        public Builder senderEmail(String senderEmail) { this.senderEmail = senderEmail; return this; }
        public Builder senderUsername(String senderUsername) { this.senderUsername = senderUsername; return this; }
        public Builder senderAvatarUrl(String senderAvatarUrl) { this.senderAvatarUrl = senderAvatarUrl; return this; }
        public Builder originalText(String originalText) { this.originalText = originalText; return this; }
        public Builder translatedText(String translatedText) { this.translatedText = translatedText; return this; }
        public Builder detectedLang(String detectedLang) { this.detectedLang = detectedLang; return this; }
        public Builder translations(Map<String, String> translations) { this.translations = translations; return this; }
        public Builder culturalFootnotes(Object culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; return this; }
        public Builder messageType(String messageType) { this.messageType = messageType; return this; }
        public Builder replyToId(UUID replyToId) { this.replyToId = replyToId; return this; }
        public Builder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }
        public Builder attachmentName(String attachmentName) { this.attachmentName = attachmentName; return this; }
        public Builder attachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; return this; }
        public Builder deliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder isMe(boolean isMe) { this.isMe = isMe; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public MessageResponse build() {
            MessageResponse r = new MessageResponse();
            r.id = this.id;
            r.roomId = this.roomId;
            r.senderId = this.senderId;
            r.senderEmail = this.senderEmail;
            r.senderUsername = this.senderUsername;
            r.senderAvatarUrl = this.senderAvatarUrl;
            r.originalText = this.originalText;
            r.translatedText = this.translatedText;
            r.detectedLang = this.detectedLang;
            r.translations = this.translations;
            r.culturalFootnotes = this.culturalFootnotes;
            r.messageType = this.messageType;
            r.replyToId = this.replyToId;
            r.attachmentUrl = this.attachmentUrl;
            r.attachmentName = this.attachmentName;
            r.attachmentSize = this.attachmentSize;
            r.deliveryStatus = this.deliveryStatus;
            r.status = this.status;
            r.isMe = this.isMe;
            r.createdAt = this.createdAt;
            return r;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getRoomId() { return roomId; }
    public void setRoomId(UUID roomId) { this.roomId = roomId; }
    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }
    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getSenderAvatarUrl() { return senderAvatarUrl; }
    public void setSenderAvatarUrl(String senderAvatarUrl) { this.senderAvatarUrl = senderAvatarUrl; }
    public String getOriginalText() { return originalText; }
    public void setOriginalText(String originalText) { this.originalText = originalText; }
    public String getTranslatedText() { return translatedText; }
    public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }
    public String getDetectedLang() { return detectedLang; }
    public void setDetectedLang(String detectedLang) { this.detectedLang = detectedLang; }
    public Map<String, String> getTranslations() { return translations; }
    public void setTranslations(Map<String, String> translations) { this.translations = translations; }
    public Object getCulturalFootnotes() { return culturalFootnotes; }
    public void setCulturalFootnotes(Object culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isMe() { return isMe; }
    public void setMe(boolean isMe) { this.isMe = isMe; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
