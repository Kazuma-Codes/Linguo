-- V6 Migration: Mutual contacts backfill
-- Friendship is mutual: every one-way contact row added before the
-- ContactService change gets its missing reverse row, so both users
-- see each other in All Contacts.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO contacts (id, user_id, contact_user_id, created_at)
SELECT gen_random_uuid(), c.contact_user_id, c.user_id, NOW()
FROM contacts c
WHERE NOT EXISTS (
    SELECT 1 FROM contacts r
    WHERE r.user_id = c.contact_user_id
      AND r.contact_user_id = c.user_id
);
