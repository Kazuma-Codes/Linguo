package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public class RoomResponse {

    private UUID id;
    private String title;

    @JsonProperty("source_lang")
    private String sourceLang;

    @JsonProperty("target_lang")
    private String targetLang;

    @JsonProperty("room_type")
    private String roomType = "group";

    private String description;
    private String emoji = "💬";

    @JsonProperty("avatar_url")
    private String avatarUrl;

    @JsonProperty("is_private")
    private Boolean isPrivate = false;

    @JsonProperty("members_count")
    private Integer membersCount = 1;

    @JsonProperty("last_message")
    private String lastMessage;

    @JsonProperty("last_message_at")
    private Instant lastMessageAt;

    @JsonProperty("unread_count")
    private Integer unreadCount = 0;

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
        private String roomType = "group";
        private String description;
        private String emoji = "💬";
        private String avatarUrl;
        private Boolean isPrivate = false;
        private Integer membersCount = 1;
        private String lastMessage;
        private Instant lastMessageAt;
        private Integer unreadCount = 0;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder sourceLang(String sourceLang) { this.sourceLang = sourceLang; return this; }
        public Builder targetLang(String targetLang) { this.targetLang = targetLang; return this; }
        public Builder roomType(String roomType) { this.roomType = roomType; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder emoji(String emoji) { this.emoji = emoji; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder isPrivate(Boolean isPrivate) { this.isPrivate = isPrivate; return this; }
        public Builder membersCount(Integer membersCount) { this.membersCount = membersCount; return this; }
        public Builder lastMessage(String lastMessage) { this.lastMessage = lastMessage; return this; }
        public Builder lastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; return this; }
        public Builder unreadCount(Integer unreadCount) { this.unreadCount = unreadCount; return this; }

        public RoomResponse build() {
            RoomResponse r = new RoomResponse(id, title, sourceLang, targetLang);
            r.setRoomType(roomType);
            r.setDescription(description);
            r.setEmoji(emoji);
            r.setAvatarUrl(avatarUrl);
            r.setIsPrivate(isPrivate);
            r.setMembersCount(membersCount);
            r.setLastMessage(lastMessage);
            r.setLastMessageAt(lastMessageAt);
            r.setUnreadCount(unreadCount);
            return r;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceLang() { return sourceLang; }
    public void setSourceLang(String sourceLang) { this.sourceLang = sourceLang; }
    public String getTargetLang() { return targetLang; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Boolean getIsPrivate() { return isPrivate; }
    public void setIsPrivate(Boolean isPrivate) { this.isPrivate = isPrivate; }
    public Integer getMembersCount() { return membersCount; }
    public void setMembersCount(Integer membersCount) { this.membersCount = membersCount; }
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public Integer getUnreadCount() { return unreadCount; }
    public void setUnreadCount(Integer unreadCount) { this.unreadCount = unreadCount; }
}
