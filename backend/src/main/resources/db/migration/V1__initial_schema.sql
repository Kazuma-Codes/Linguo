CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(255) NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    source_lang VARCHAR(255) NOT NULL DEFAULT 'en',
    target_lang VARCHAR(255) NOT NULL DEFAULT 'es',
    creator_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_chat_rooms_creator_id ON chat_rooms(creator_id);

CREATE TABLE chat_participants (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(255),
    joined_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_chat_participants_room_user UNIQUE (room_id, user_id)
);

CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    original_text TEXT,
    translated_text TEXT,
    detected_lang VARCHAR(255),
    message_type VARCHAR(255) NOT NULL DEFAULT 'text',
    audio_url VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'draft',
    cultural_footnotes TEXT,
    tts_url VARCHAR(255),
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_messages_room_created_at ON messages(room_id, created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
