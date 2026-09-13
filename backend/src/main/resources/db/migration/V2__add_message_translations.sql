-- Per-recipient-language translations, stored as a JSON object
-- mapping each listener seat language to its translated text,
-- e.g. {"es":"...","fr":"..."}.
ALTER TABLE messages ADD COLUMN translations TEXT;
