/*
  Warnings:

  - You are about to drop the column `active_status` on the `auth_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `auth_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `auth_accounts` table. All the data in the column will be lost.
  - The `role` column on the `auth_accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `cccd` on the `voice_records` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `voice_records` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `voice_records` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `voice_records` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `voice_records` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `voice_records` table. All the data in the column will be lost.
  - Changed the type of `session_type` on the `identify_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `results` on table `identify_sessions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `user_id` to the `voice_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voice_id` to the `voice_records` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('SINGLE', 'MULTI');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- DropIndex
DROP INDEX "voice_records_cccd_key";

-- AlterTable
ALTER TABLE "auth_accounts" DROP COLUMN "active_status",
DROP COLUMN "created_at",
DROP COLUMN "updated_at",
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "identify_sessions" DROP COLUMN "session_type",
ADD COLUMN     "session_type" "SessionType" NOT NULL,
ALTER COLUMN "results" SET NOT NULL;

-- AlterTable
ALTER TABLE "voice_records" DROP COLUMN "cccd",
DROP COLUMN "embedding",
DROP COLUMN "metadata",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "updated_at",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "user_id" UUID NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "voice_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "citizen_identification" TEXT,
    "phone_number" TEXT,
    "hometown" TEXT,
    "job" TEXT,
    "passport" TEXT,
    "criminal_record" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "update_voice_jobs" (
    "id" UUID NOT NULL,
    "voice_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "audio_urls" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "update_voice_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE INDEX "users_citizen_identification_idx" ON "users"("citizen_identification");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "update_voice_jobs_voice_id_idx" ON "update_voice_jobs"("voice_id");

-- CreateIndex
CREATE INDEX "update_voice_jobs_status_idx" ON "update_voice_jobs"("status");

-- CreateIndex
CREATE INDEX "update_voice_jobs_user_id_idx" ON "update_voice_jobs"("user_id");

-- CreateIndex
CREATE INDEX "update_voice_jobs_voice_id_status_idx" ON "update_voice_jobs"("voice_id", "status");

-- CreateIndex
CREATE INDEX "identify_sessions_user_id_idx" ON "identify_sessions"("user_id");

-- CreateIndex
CREATE INDEX "identify_sessions_identified_at_idx" ON "identify_sessions"("identified_at");

-- CreateIndex
CREATE INDEX "identify_sessions_user_id_identified_at_idx" ON "identify_sessions"("user_id", "identified_at");

-- CreateIndex
CREATE INDEX "voice_records_user_id_idx" ON "voice_records"("user_id");

-- CreateIndex
CREATE INDEX "voice_records_is_active_idx" ON "voice_records"("is_active");

-- CreateIndex
CREATE INDEX "voice_records_user_id_is_active_idx" ON "voice_records"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "voice_records" ADD CONSTRAINT "voice_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identify_sessions" ADD CONSTRAINT "identify_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "update_voice_jobs" ADD CONSTRAINT "update_voice_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (Manual: Partial Unique Index — not supported by Prisma generator)
-- Enforces: each user can have at most ONE voice_record with is_active = TRUE.
-- Application code must set is_active = FALSE on the old record before activating a new one.
CREATE UNIQUE INDEX "voice_records_user_id_active_unique"
ON "voice_records" ("user_id")
WHERE is_active = TRUE;
