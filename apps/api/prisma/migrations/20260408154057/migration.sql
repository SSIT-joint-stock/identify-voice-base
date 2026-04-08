/*
  Warnings:

  - You are about to drop the column `session_type` on the `identify_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "identify_sessions" DROP COLUMN "session_type";

-- DropEnum
DROP TYPE "SessionType";

-- CreateTable
CREATE TABLE "ai_identities_cache" (
    "voice_id" TEXT NOT NULL,
    "name" TEXT,
    "citizen_identification" TEXT,
    "phone_number" TEXT,
    "hometown" TEXT,
    "job" TEXT,
    "passport" TEXT,
    "criminal_record" JSONB,
    "raw" JSONB NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_identities_cache_pkey" PRIMARY KEY ("voice_id")
);
