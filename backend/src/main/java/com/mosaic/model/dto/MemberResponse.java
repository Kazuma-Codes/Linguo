package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public class MemberResponse {

    private String email;
    private String language;

    @JsonProperty("joined_at")
    private Instant joinedAt;

    public MemberResponse() {}

    public MemberResponse(String email, String language, Instant joinedAt) {
        this.email = email;
        this.language = language;
        this.joinedAt = joinedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String email;
        private String language;
        private Instant joinedAt;

        public Builder email(String email) { this.email = email; return this; }
        public Builder language(String language) { this.language = language; return this; }
        public Builder joinedAt(Instant joinedAt) { this.joinedAt = joinedAt; return this; }

        public MemberResponse build() {
            return new MemberResponse(email, language, joinedAt);
        }
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
