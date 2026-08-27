package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class WsOutgoingMessage {

    private String type;
    private String id;

    @JsonProperty("sender_email")
    private String senderEmail;

    private String text;

    @JsonProperty("original_text")
    private String originalText;

    @JsonProperty("translated_text")
    private String translatedText;

    @JsonProperty("detected_lang")
    private String detectedLang;

    @JsonProperty("cultural_footnotes")
    private Object culturalFootnotes;

    private String status;

    @JsonProperty("tts_url")
    private String ttsUrl;

    @JsonProperty("audio_url")
    private String audioUrl;

    public WsOutgoingMessage() {}

    public WsOutgoingMessage(String type, String id, String senderEmail, String text, String originalText, String translatedText, String detectedLang, Object culturalFootnotes, String status, String ttsUrl, String audioUrl) {
        this.type = type;
        this.id = id;
        this.senderEmail = senderEmail;
        this.text = text;
        this.originalText = originalText;
        this.translatedText = translatedText;
        this.detectedLang = detectedLang;
        this.culturalFootnotes = culturalFootnotes;
        this.status = status;
        this.ttsUrl = ttsUrl;
        this.audioUrl = audioUrl;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String type;
        private String id;
        private String senderEmail;
        private String text;
        private String originalText;
        private String translatedText;
        private String detectedLang;
        private Object culturalFootnotes;
        private String status;
        private String ttsUrl;
        private String audioUrl;

        public Builder type(String type) { this.type = type; return this; }
        public Builder id(String id) { this.id = id; return this; }
        public Builder senderEmail(String senderEmail) { this.senderEmail = senderEmail; return this; }
        public Builder text(String text) { this.text = text; return this; }
        public Builder originalText(String originalText) { this.originalText = originalText; return this; }
        public Builder translatedText(String translatedText) { this.translatedText = translatedText; return this; }
        public Builder detectedLang(String detectedLang) { this.detectedLang = detectedLang; return this; }
        public Builder culturalFootnotes(Object culturalFootnotes) { this.culturalFootnotes = culturalFootnotes; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder ttsUrl(String ttsUrl) { this.ttsUrl = ttsUrl; return this; }
        public Builder audioUrl(String audioUrl) { this.audioUrl = audioUrl; return this; }

        public WsOutgoingMessage build() {
            return new WsOutgoingMessage(type, id, senderEmail, text, originalText, translatedText, detectedLang, culturalFootnotes, status, ttsUrl, audioUrl);
        }
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }
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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTtsUrl() { return ttsUrl; }
    public void setTtsUrl(String ttsUrl) { this.ttsUrl = ttsUrl; }
    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
}
