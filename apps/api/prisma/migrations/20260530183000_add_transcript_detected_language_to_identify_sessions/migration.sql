-- Add transcript and detected_language columns to identify_sessions
-- These fields store Speech-to-Text output and language detection results

ALTER TABLE "identify_sessions"
ADD COLUMN IF NOT EXISTS "transcript" TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "detected_language" TEXT DEFAULT '';
