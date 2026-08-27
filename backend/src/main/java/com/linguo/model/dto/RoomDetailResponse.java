package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class RoomDetailResponse extends RoomResponse {

    @JsonProperty("creator_id")
    private UUID creatorId;

    @JsonProperty("my_language")
    private String myLanguage;

    public RoomDetailResponse() {}

    public RoomDetailResponse(UUID id, String title, String sourceLang, String targetLang, UUID creatorId, String myLanguage) {
        super(id, title, sourceLang, targetLang);
        this.creatorId = creatorId;
        this.myLanguage = myLanguage;
    }

    public static DetailBuilder detailBuilder() { return new DetailBuilder(); }

    public static class DetailBuilder {
        private UUID id;
        private String title;
        private String sourceLang;
        private String targetLang;
        private UUID creatorId;
        private String myLanguage;

        public DetailBuilder id(UUID id) { this.id = id; return this; }
        public DetailBuilder title(String title) { this.title = title; return this; }
        public DetailBuilder sourceLang(String sourceLang) { this.sourceLang = sourceLang; return this; }
        public DetailBuilder targetLang(String targetLang) { this.targetLang = targetLang; return this; }
        public DetailBuilder creatorId(UUID creatorId) { this.creatorId = creatorId; return this; }
        public DetailBuilder myLanguage(String myLanguage) { this.myLanguage = myLanguage; return this; }

        public RoomDetailResponse build() {
            return new RoomDetailResponse(id, title, sourceLang, targetLang, creatorId, myLanguage);
        }
    }

    public UUID getCreatorId() { return creatorId; }
    public void setCreatorId(UUID creatorId) { this.creatorId = creatorId; }
    public String getMyLanguage() { return myLanguage; }
    public void setMyLanguage(String myLanguage) { this.myLanguage = myLanguage; }
}
