package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public class MemberResponse {

    @JsonProperty("user_id")
    private UUID userId;

    private String email;
    private String username;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    private String language;

    @JsonProperty("joined_at")
    private Instant joinedAt;

    public MemberResponse() {}

    public MemberResponse(UUID userId, String email, String username, String avatarUrl, String language, Instant joinedAt) {
        this.userId = userId;
        this.email = email;
        this.username = username;
        this.avatarUrl = avatarUrl;
        this.language = language;
        this.joinedAt = joinedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID userId;
        private String email;
        private String username;
        private String avatarUrl;
        private String language;
        private Instant joinedAt;

        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder language(String language) { this.language = language; return this; }
        public Builder joinedAt(Instant joinedAt) { this.joinedAt = joinedAt; return this; }

        public MemberResponse build() {
            return new MemberResponse(userId, email, username, avatarUrl, language, joinedAt);
        }
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
