-- V4 Migration: Orbit & Halo Enhancements
-- Adds support for User profiles, Direct 1-on-1 vs Group chat rooms, Message replies/attachments/status, and Contacts

-- 1. User Profile Enhancements (Orbit)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS about VARCHAR(255) DEFAULT 'Hey there! I am using Linguo.';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Populate username for existing users
UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL;

-- 2. Chat Room Enhancements (Direct 1-on-1 vs Groups)
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) NOT NULL DEFAULT 'group';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS emoji VARCHAR(10) DEFAULT '💬';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- 3. Message Capabilities (Replies, Attachments, Delivery Status)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'read';

-- 4. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_contact UNIQUE (user_id, contact_user_id)
);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

-- 5. Contact Requests Table
CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID PRIMARY KEY,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_contact_req UNIQUE (from_user_id, to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_requests_to_user ON contact_requests(to_user_id, status);
