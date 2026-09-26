package com.mosaic.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "hashed_password", nullable = false)
    private String hashedPassword;

    @Column(name = "preferred_language", nullable = false)
    private String preferredLanguage = "en";

    private String username;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    private String about = "Hey there! I am using Linguo.";

    private String phone;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "creator", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatRoom> roomsCreated = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatParticipant> participations = new ArrayList<>();

    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Message> messagesSent = new ArrayList<>();

    public User() {}

    public User(UUID id, String email, String hashedPassword, String preferredLanguage,
                String username, String avatarUrl, String about, String phone,
                Boolean isActive, Instant createdAt) {
        this.id = id;
        this.email = email;
        this.hashedPassword = hashedPassword;
        this.preferredLanguage = preferredLanguage != null ? preferredLanguage : "en";
        this.username = username != null ? username : (email != null ? email.split("@")[0] : null);
        this.avatarUrl = avatarUrl;
        this.about = about != null ? about : "Hey there! I am using Linguo.";
        this.phone = phone;
        this.isActive = isActive != null ? isActive : true;
        this.createdAt = createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private String email;
        private String hashedPassword;
        private String preferredLanguage = "en";
        private String username;
        private String avatarUrl;
        private String about = "Hey there! I am using Linguo.";
        private String phone;
        private Boolean isActive = true;
        private Instant createdAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder hashedPassword(String hashedPassword) { this.hashedPassword = hashedPassword; return this; }
        public Builder preferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder about(String about) { this.about = about; return this; }
        public Builder phone(String phone) { this.phone = phone; return this; }
        public Builder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public User build() {
            return new User(id, email, hashedPassword, preferredLanguage, username, avatarUrl, about, phone, isActive, createdAt);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getHashedPassword() { return hashedPassword; }
    public void setHashedPassword(String hashedPassword) { this.hashedPassword = hashedPassword; }
    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<ChatRoom> getRoomsCreated() { return roomsCreated; }
    public void setRoomsCreated(List<ChatRoom> roomsCreated) { this.roomsCreated = roomsCreated; }
    public List<ChatParticipant> getParticipations() { return participations; }
    public void setParticipations(List<ChatParticipant> participations) { this.participations = participations; }
    public List<Message> getMessagesSent() { return messagesSent; }
    public void setMessagesSent(List<Message> messagesSent) { this.messagesSent = messagesSent; }
}
