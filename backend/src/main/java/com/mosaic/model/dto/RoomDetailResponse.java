package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RoomDetailResponse extends RoomResponse {

    @JsonProperty("creator_id")
    private UUID creatorId;

    @JsonProperty("my_language")
    private String myLanguage;

    private List<MemberResponse> members = new ArrayList<>();

    @JsonProperty("distinct_langs")
    private List<String> distinctLangs = new ArrayList<>();

    public RoomDetailResponse() {}

    public RoomDetailResponse(UUID id, String title, String sourceLang, String targetLang,
                              UUID creatorId, String myLanguage,
                              List<MemberResponse> members, List<String> distinctLangs) {
        super(id, title, sourceLang, targetLang);
        this.creatorId = creatorId;
        this.myLanguage = myLanguage;
        this.members = members != null ? members : new ArrayList<>();
        this.distinctLangs = distinctLangs != null ? distinctLangs : new ArrayList<>();
    }

    public static DetailBuilder detailBuilder() { return new DetailBuilder(); }

    public static class DetailBuilder {
        private UUID id;
        private String title;
        private String sourceLang;
        private String targetLang;
        private UUID creatorId;
        private String myLanguage;
        private List<MemberResponse> members = new ArrayList<>();
        private List<String> distinctLangs = new ArrayList<>();

        public DetailBuilder id(UUID id) { this.id = id; return this; }
        public DetailBuilder title(String title) { this.title = title; return this; }
        public DetailBuilder sourceLang(String sourceLang) { this.sourceLang = sourceLang; return this; }
        public DetailBuilder targetLang(String targetLang) { this.targetLang = targetLang; return this; }
        public DetailBuilder creatorId(UUID creatorId) { this.creatorId = creatorId; return this; }
        public DetailBuilder myLanguage(String myLanguage) { this.myLanguage = myLanguage; return this; }
        public DetailBuilder members(List<MemberResponse> members) { this.members = members; return this; }
        public DetailBuilder distinctLangs(List<String> distinctLangs) { this.distinctLangs = distinctLangs; return this; }

        public RoomDetailResponse build() {
            return new RoomDetailResponse(id, title, sourceLang, targetLang, creatorId, myLanguage, members, distinctLangs);
        }
    }

    public UUID getCreatorId() { return creatorId; }
    public void setCreatorId(UUID creatorId) { this.creatorId = creatorId; }
    public String getMyLanguage() { return myLanguage; }
    public void setMyLanguage(String myLanguage) { this.myLanguage = myLanguage; }
    public List<MemberResponse> getMembers() { return members; }
    public void setMembers(List<MemberResponse> members) { this.members = members; }
    public List<String> getDistinctLangs() { return distinctLangs; }
    public void setDistinctLangs(List<String> distinctLangs) { this.distinctLangs = distinctLangs; }
}
