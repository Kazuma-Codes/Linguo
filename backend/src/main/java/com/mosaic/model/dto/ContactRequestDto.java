package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public class ContactRequestDto {

    private UUID id;

    @JsonProperty("from_user_id")
    private UUID fromUserId;

    @JsonProperty("from_user_email")
    private String fromUserEmail;

    @JsonProperty("from_user_username")
    private String fromUserUsername;

    @JsonProperty("from_user_avatar_url")
    private String fromUserAvatarUrl;

    private String content;
    private String status;

    @JsonProperty("created_at")
    private Instant createdAt;

    public ContactRequestDto() {}

    public ContactRequestDto(UUID id, UUID fromUserId, String fromUserEmail, String fromUserUsername,
                             String fromUserAvatarUrl, String content, String status, Instant createdAt) {
        this.id = id;
        this.fromUserId = fromUserId;
        this.fromUserEmail = fromUserEmail;
        this.fromUserUsername = fromUserUsername;
        this.fromUserAvatarUrl = fromUserAvatarUrl;
        this.content = content;
        this.status = status;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getFromUserId() { return fromUserId; }
    public void setFromUserId(UUID fromUserId) { this.fromUserId = fromUserId; }
    public String getFromUserEmail() { return fromUserEmail; }
    public void setFromUserEmail(String fromUserEmail) { this.fromUserEmail = fromUserEmail; }
    public String getFromUserUsername() { return fromUserUsername; }
    public void setFromUserUsername(String fromUserUsername) { this.fromUserUsername = fromUserUsername; }
    public String getFromUserAvatarUrl() { return fromUserAvatarUrl; }
    public void setFromUserAvatarUrl(String fromUserAvatarUrl) { this.fromUserAvatarUrl = fromUserAvatarUrl; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
