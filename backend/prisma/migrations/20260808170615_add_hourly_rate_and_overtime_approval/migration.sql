-- Ish haqini soatlab hisoblash va kamomad/otrabotka funksiyasi uchun.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "hourlyRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "overtime_approvals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutesApplied" INTEGER NOT NULL,
    "note" TEXT,
    "approvedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_approvals_userId_idx" ON "overtime_approvals"("userId");

-- CreateIndex
CREATE INDEX "overtime_approvals_createdAt_idx" ON "overtime_approvals"("createdAt");

-- AddForeignKey
ALTER TABLE "overtime_approvals" ADD CONSTRAINT "overtime_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_approvals" ADD CONSTRAINT "overtime_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
