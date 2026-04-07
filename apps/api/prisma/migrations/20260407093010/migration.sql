-- AlterTable
ALTER TABLE "users" ADD COLUMN     "audio_url" TEXT;

-- AlterTable
ALTER TABLE "voice_records" ADD COLUMN     "user_email" TEXT,
ADD COLUMN     "user_name" TEXT;
