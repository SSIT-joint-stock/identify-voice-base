/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `auth_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `auth_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "auth_accounts" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "username" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_email_key" ON "auth_accounts"("email");
