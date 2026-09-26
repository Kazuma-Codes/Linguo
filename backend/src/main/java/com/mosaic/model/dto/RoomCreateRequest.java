package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public class RoomCreateRequest {

    @Size(max = 255, message = "Title must be at most 255 characters")
    private String title;

    @JsonProperty("source_lang")
    @Size(max = 50, message = "Source language must be at most 50 characters")
    private String sourceLang = "en";

    @JsonProperty("target_lang")
    @Size(max = 50, message = "Target language must be at most 50 characters")
    private String targetLang = "es";

    @JsonProperty("room_type")
    private String roomType = "group"; // "group" | "direct"

    private String description;
    private String emoji;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    @JsonProperty("is_private")
    private Boolean isPrivate = false;

    public RoomCreateRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceLang() { return sourceLang != null && !sourceLang.isBlank() ? sourceLang : "en"; }
    public void setSourceLang(String sourceLang) { this.sourceLang = sourceLang; }
    public String getTargetLang() { return targetLang != null && !targetLang.isBlank() ? targetLang : "es"; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
    public String getRoomType() { return roomType != null ? roomType : "group"; }
    public void setRoomType(String roomType) { this.roomType = roomType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getEmoji() { return emoji != null ? emoji : "💬"; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Boolean getIsPrivate() { return isPrivate != null ? isPrivate : false; }
    public void setIsPrivate(Boolean isPrivate) { this.isPrivate = isPrivate; }
}
