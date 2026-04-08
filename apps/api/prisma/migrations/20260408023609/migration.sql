-- CreateEnum
CREATE TYPE "UserSource" AS ENUM ('SYSTEM', 'AI_IMPORTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "source" "UserSource" NOT NULL DEFAULT 'SYSTEM';
