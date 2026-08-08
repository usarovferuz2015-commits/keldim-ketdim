-- Schema drift fix: the initial migration predates admin-provisioned
-- email/password login and never added these columns, even though
-- prisma/schema.prisma already declares them. This adds what's missing
-- so `users` matches the current schema.

-- telegramId is now optional (accounts are admin-provisioned via email,
-- Telegram linking is optional)
ALTER TABLE "users" ALTER COLUMN "telegramId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
