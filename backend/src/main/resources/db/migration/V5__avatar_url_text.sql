-- V5 Migration: Support large avatar URLs / base64 image data URLs
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
ALTER TABLE chat_rooms ALTER COLUMN avatar_url TYPE TEXT;
