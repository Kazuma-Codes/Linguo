package com.mosaic.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "chat_rooms")
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;

    @Column(name = "source_lang", nullable = false)
    private String sourceLang = "en";

    @Column(name = "target_lang", nullable = false)
    private String targetLang = "es";

    @Column(name = "max_members")
    private Integer maxMembers = 50;

    @Column(name = "room_type", nullable = false)
    private String roomType = "group"; // "direct" | "group"

    @Column(columnDefinition = "TEXT")
    private String description;

    private String emoji = "💬";

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "is_private")
    private Boolean isPrivate = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<Message> messages = new ArrayList<>();

    public ChatRoom() {}

    public ChatRoom(UUID id, String title, String sourceLang, String targetLang, Integer maxMembers,
                    String roomType, String description, String emoji, String avatarUrl, Boolean isPrivate,
                    User creator, Instant createdAt) {
        this.id = id;
        this.title = title;
        this.sourceLang = sourceLang != null ? sourceLang : "en";
        this.targetLang = targetLang != null ? targetLang : "es";
        this.maxMembers = maxMembers != null ? maxMembers : 50;
        this.roomType = roomType != null ? roomType : "group";
        this.description = description;
        this.emoji = emoji != null ? emoji : "💬";
        this.avatarUrl = avatarUrl;
        this.isPrivate = isPrivate != null ? isPrivate : false;
        this.creator = creator;
        this.createdAt = createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private String title;
        private String sourceLang = "en";
        private String targetLang = "es";
        private Integer maxMembers = 50;
        private String roomType = "group";
        private String description;
        private String emoji = "💬";
        private String avatarUrl;
        private Boolean isPrivate = false;
        private User creator;
        private Instant createdAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder sourceLang(String sourceLang) { this.sourceLang = sourceLang; return this; }
        public Builder targetLang(String targetLang) { this.targetLang = targetLang; return this; }
        public Builder maxMembers(Integer maxMembers) { this.maxMembers = maxMembers; return this; }
        public Builder roomType(String roomType) { this.roomType = roomType; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder emoji(String emoji) { this.emoji = emoji; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder isPrivate(Boolean isPrivate) { this.isPrivate = isPrivate; return this; }
        public Builder creator(User creator) { this.creator = creator; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public ChatRoom build() {
            return new ChatRoom(id, title, sourceLang, targetLang, maxMembers, roomType, description, emoji, avatarUrl, isPrivate, creator, createdAt);
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
    public Integer getMaxMembers() { return maxMembers; }
    public void setMaxMembers(Integer maxMembers) { this.maxMembers = maxMembers; }
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
    public User getCreator() { return creator; }
    public void setCreator(User creator) { this.creator = creator; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<ChatParticipant> getParticipants() { return participants; }
    public void setParticipants(List<ChatParticipant> participants) { this.participants = participants; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}
