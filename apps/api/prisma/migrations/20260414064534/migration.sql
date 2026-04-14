/*
  Warnings:

  - You are about to drop the column `version` on the `voice_records` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "voice_records_is_active_idx";

-- AlterTable
ALTER TABLE "voice_records" DROP COLUMN "version";

-- CreateTable
CREATE TABLE "voice_update_logs" (
    "id" UUID NOT NULL,
    "voice_record_id" UUID NOT NULL,
    "voice_id" TEXT NOT NULL,
    "audio_file_id" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_update_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_update_logs_voice_record_id_idx" ON "voice_update_logs"("voice_record_id");

-- CreateIndex
CREATE INDEX "voice_update_logs_voice_id_idx" ON "voice_update_logs"("voice_id");

-- CreateIndex
CREATE INDEX "voice_update_logs_audio_file_id_idx" ON "voice_update_logs"("audio_file_id");

-- CreateIndex
CREATE INDEX "voice_records_voice_id_idx" ON "voice_records"("voice_id");

-- AddForeignKey
ALTER TABLE "voice_update_logs" ADD CONSTRAINT "voice_update_logs_audio_file_id_fkey" FOREIGN KEY ("audio_file_id") REFERENCES "audio_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_update_logs" ADD CONSTRAINT "voice_update_logs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_update_logs" ADD CONSTRAINT "voice_update_logs_voice_record_id_fkey" FOREIGN KEY ("voice_record_id") REFERENCES "voice_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
