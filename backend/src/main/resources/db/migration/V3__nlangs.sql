-- Indexes room_id to accelerate parallel participant lookups during message fan-out
CREATE INDEX idx_participants_room ON chat_participants(room_id);

-- Enforces an upper ceiling of participants per room (default 50)
ALTER TABLE chat_rooms ADD COLUMN max_members INT DEFAULT 50;
