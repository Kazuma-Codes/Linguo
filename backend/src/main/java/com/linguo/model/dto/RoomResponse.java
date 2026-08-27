package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class RoomResponse {

    private UUID id;
    private String title;

    @JsonProperty("source_lang")
    private String sourceLang;

    @JsonProperty("target_lang")
    private String targetLang;

    public RoomResponse() {}

    public RoomResponse(UUID id, String title, String sourceLang, String targetLang) {
        this.id = id;
        this.title = title;
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private String title;
        private String sourceLang;
        private String targetLang;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder sourceLang(String sourceLang) { this.sourceLang = sourceLang; return this; }
        public Builder targetLang(String targetLang) { this.targetLang = targetLang; return this; }
        public RoomResponse build() { return new RoomResponse(id, title, sourceLang, targetLang); }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceLang() { return sourceLang; }
    public void setSourceLang(String sourceLang) { this.sourceLang = sourceLang; }
    public String getTargetLang() { return targetLang; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
}
