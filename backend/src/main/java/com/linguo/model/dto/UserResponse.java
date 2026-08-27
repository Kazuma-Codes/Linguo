package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class UserResponse {

    private UUID id;
    private String email;

    @JsonProperty("preferred_language")
    private String preferredLanguage;

    public UserResponse() {}

    public UserResponse(UUID id, String email, String preferredLanguage) {
        this.id = id;
        this.email = email;
        this.preferredLanguage = preferredLanguage;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private String email;
        private String preferredLanguage;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder preferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; return this; }
        public UserResponse build() { return new UserResponse(id, email, preferredLanguage); }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }
}
