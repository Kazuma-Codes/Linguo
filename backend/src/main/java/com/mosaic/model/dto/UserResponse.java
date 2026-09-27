package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class UserResponse {

    private UUID id;
    private String email;
    private String username;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    private String about;
    private String phone;

    @JsonProperty("preferred_language")
    private String preferredLanguage;

    @JsonProperty("show_online")
    private Boolean showOnline;

    @JsonProperty("read_receipts")
    private Boolean readReceipts;

    public UserResponse() {}

    public UserResponse(UUID id, String email, String username, String avatarUrl, String about, String phone, String preferredLanguage) {
        this.id = id;
        this.email = email;
        this.username = username != null ? username : (email != null ? email.split("@")[0] : null);
        this.avatarUrl = avatarUrl;
        this.about = about;
        this.phone = phone;
        this.preferredLanguage = preferredLanguage;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private String email;
        private String username;
        private String avatarUrl;
        private String about;
        private String phone;
        private String preferredLanguage;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder about(String about) { this.about = about; return this; }
        public Builder phone(String phone) { this.phone = phone; return this; }
        public Builder preferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; return this; }
        public UserResponse build() { return new UserResponse(id, email, username, avatarUrl, about, phone, preferredLanguage); }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
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
    public Boolean getShowOnline() { return showOnline; }
    public void setShowOnline(Boolean showOnline) { this.showOnline = showOnline; }
    public Boolean getReadReceipts() { return readReceipts; }
    public void setReadReceipts(Boolean readReceipts) { this.readReceipts = readReceipts; }
}
