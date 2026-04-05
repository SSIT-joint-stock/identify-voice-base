/*
  Warnings:

  - You are about to drop the column `audio_url` on the `identify_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `audio_urls` on the `update_voice_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `audio_url` on the `voice_records` table. All the data in the column will be lost.
  - Added the required column `audio_file_id` to the `identify_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `audio_file_ids` to the `update_voice_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `audio_file_id` to the `voice_records` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AudioPurpose" AS ENUM ('ENROLL', 'IDENTIFY', 'UPDATE_VOICE');

-- AlterTable
ALTER TABLE "identify_sessions" DROP COLUMN "audio_url",
ADD COLUMN     "audio_file_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "update_voice_jobs" DROP COLUMN "audio_urls",
ADD COLUMN     "audio_file_ids" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "voice_records" DROP COLUMN "audio_url",
ADD COLUMN     "audio_file_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "audio_files" (
    "id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "duration_sec" DOUBLE PRECISION,
    "purpose" "AudioPurpose" NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_files_file_path_key" ON "audio_files"("file_path");

-- CreateIndex
CREATE INDEX "audio_files_purpose_idx" ON "audio_files"("purpose");

-- CreateIndex
CREATE INDEX "audio_files_uploaded_by_idx" ON "audio_files"("uploaded_by");

-- CreateIndex
CREATE INDEX "audio_files_deleted_at_idx" ON "audio_files"("deleted_at");

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_records" ADD CONSTRAINT "voice_records_audio_file_id_fkey" FOREIGN KEY ("audio_file_id") REFERENCES "audio_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identify_sessions" ADD CONSTRAINT "identify_sessions_audio_file_id_fkey" FOREIGN KEY ("audio_file_id") REFERENCES "audio_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
