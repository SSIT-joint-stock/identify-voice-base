-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OPERATOR';

-- AlterTable
ALTER TABLE "auth_accounts" ADD COLUMN     "permissions" JSONB;
