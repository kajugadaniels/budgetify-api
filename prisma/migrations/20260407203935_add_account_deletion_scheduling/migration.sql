-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountDeletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "accountDeletionScheduledFor" TIMESTAMP(3);
