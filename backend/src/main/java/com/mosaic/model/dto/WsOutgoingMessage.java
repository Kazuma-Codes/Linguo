package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class WsOutgoingMessage {

    private String type;
    private String id;

    @JsonProperty("sender_email")
    private String senderEmail;

    @JsonProperty("sender_username")
    private String senderUsername;

    @JsonProperty("sender_avatar_url")
    private String senderAvatarUrl;

    private String text;

    @JsonProperty("original_text")
    private String originalText;

    @JsonProperty("translated_text")
    private String translatedText;

    @JsonProperty("detected_lang")
    private String detectedLang;

    @JsonProperty("cultural_footnotes")
    private Object culturalFootnotes;

    @JsonProperty("translations")
    private Map<String, String> translations;

    private String status;

    @JsonProperty("tts_url")
    private String ttsUrl;

    @JsonProperty("audio_url")
    private String audioUrl;

    @JsonProperty("reply_to_id")
    private String replyToId;

    @JsonProperty("attachment_url")
    private String attachmentUrl;

    @JsonProperty("attachment_name")
    private String attachmentName;

    @JsonProperty("attachment_size")
    private Long attachmentSize;

    @JsonProperty("delivery_status")
    private String deliveryStatus;

    @JsonProperty("message_type")
    private String messageType;

    @JsonProperty("is_typing")
    private Boolean isTyping;

    @JsonProperty("created_at")
    private Long createdAt;

    public WsOutgoingMessage() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String type;
        private String id;
        private String senderEmail;
        private String senderUsername;
        private String senderAvatarUrl;
        private String text;
        private String originalText;
        private String translatedText;
        private String detectedLang;
        private Object culturalFootnotes;
        private Map<String, String> translations;
        private String status;
        private String ttsUrl;
        private String audioUrl;
        private String replyToId;
        private String attachmentUrl;
        private String attachmentName;
        private Long attachmentSize;
        private String deliveryStatus;
        private String messageType = "text";
        private Boolean isTyping;
        private Long createdAt;

        public Builder type(String type) { this.type = type; return this; }
        public Builder id(String id) { this.id = id; return this; }
        public Builder senderEmail(String senderEmail) { this.senderEmail = senderEmail; return this; }
        public Builder senderUsername(String senderUsername) { this.senderUsername = senderUsername; return this; }
        public Builder senderAvatarUrl(String senderAvatarUrl) { this.senderAvatarUrl = senderAvatarUrl; return this; }
        public Builder text(String text) { this.text = text; return this; }
        public Builder originalText(String originalText) { this.originalText = originalText; return this; }
        public Builder translatedText(String translatedText) { this.translatedText = translatedText; return this; }
        public Builder detectedLang(String detectedLang) { this.detectedLang = detectedLang; return this; }
        public Builder culturalFootnotes(Object culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; return this; }
        public Builder translations(Map<String, String> translations) { this.translations = translations; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder ttsUrl(String ttsUrl) { this.ttsUrl = ttsUrl; return this; }
        public Builder audioUrl(String audioUrl) { this.audioUrl = audioUrl; return this; }
        public Builder replyToId(String replyToId) { this.replyToId = replyToId; return this; }
        public Builder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }
        public Builder attachmentName(String attachmentName) { this.attachmentName = attachmentName; return this; }
        public Builder attachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; return this; }
        public Builder deliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; return this; }
        public Builder messageType(String messageType) { this.messageType = messageType; return this; }
        public Builder isTyping(Boolean isTyping) { this.isTyping = isTyping; return this; }
        public Builder createdAt(Long createdAt) { this.createdAt = createdAt; return this; }

        public WsOutgoingMessage build() {
            WsOutgoingMessage msg = new WsOutgoingMessage();
            msg.type = this.type;
            msg.id = this.id;
            msg.senderEmail = this.senderEmail;
            msg.senderUsername = this.senderUsername;
            msg.senderAvatarUrl = this.senderAvatarUrl;
            msg.text = this.text;
            msg.originalText = this.originalText;
            msg.translatedText = this.translatedText;
            msg.detectedLang = this.detectedLang;
            msg.culturalFootnotes = this.culturalFootnotes;
            msg.translations = this.translations;
            msg.status = this.status;
            msg.ttsUrl = this.ttsUrl;
            msg.audioUrl = this.audioUrl;
            msg.replyToId = this.replyToId;
            msg.attachmentUrl = this.attachmentUrl;
            msg.attachmentName = this.attachmentName;
            msg.attachmentSize = this.attachmentSize;
            msg.deliveryStatus = this.deliveryStatus;
            msg.messageType = this.messageType;
            msg.isTyping = this.isTyping;
            msg.createdAt = this.createdAt;
            return msg;
        }
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getSenderAvatarUrl() { return senderAvatarUrl; }
    public void setSenderAvatarUrl(String senderAvatarUrl) { this.senderAvatarUrl = senderAvatarUrl; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getOriginalText() { return originalText; }
    public void setOriginalText(String originalText) { this.originalText = originalText; }
    public String getTranslatedText() { return translatedText; }
    public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }
    public String getDetectedLang() { return detectedLang; }
    public void setDetectedLang(String detectedLang) { this.detectedLang = detectedLang; }
    public Object getCulturalFootnotes() { return culturalFootnotes; }
    public void setCulturalFootnotes(Object culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; }
    public Map<String, String> getTranslations() { return translations; }
    public void setTranslations(Map<String, String> translations) { this.translations = translations; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTtsUrl() { return ttsUrl; }
    public void setTtsUrl(String ttsUrl) { this.ttsUrl = ttsUrl; }
    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
    public String getReplyToId() { return replyToId; }
    public void setReplyToId(String replyToId) { this.replyToId = replyToId; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }
    public String getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public Boolean getIsTyping() { return isTyping; }
    public void setIsTyping(Boolean isTyping) { this.isTyping = isTyping; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}
