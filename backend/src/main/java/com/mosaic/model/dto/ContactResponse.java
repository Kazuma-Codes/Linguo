package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public class ContactResponse {

    private UUID id;

    @JsonProperty("user_id")
    private UUID userId;

    private String email;
    private String username;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    private String about;
    private String phone;

    @JsonProperty("preferred_language")
    private String preferredLanguage;

    @JsonProperty("direct_room_id")
    private UUID directRoomId;

    @JsonProperty("created_at")
    private Instant createdAt;

    public ContactResponse() {}

    public ContactResponse(UUID id, UUID userId, String email, String username, String avatarUrl,
                           String about, String phone, String preferredLanguage, UUID directRoomId, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.email = email;
        this.username = username;
        this.avatarUrl = avatarUrl;
        this.about = about;
        this.phone = phone;
        this.preferredLanguage = preferredLanguage;
        this.directRoomId = directRoomId;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }
    public UUID getDirectRoomId() { return directRoomId; }
    public void setDirectRoomId(UUID directRoomId) { this.directRoomId = directRoomId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
