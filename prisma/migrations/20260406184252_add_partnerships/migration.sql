-- CreateEnum
CREATE TYPE "PartnershipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateTable
CREATE TABLE "Partnership" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "partnerId" UUID,
    "inviteeEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_ownerId_key" ON "Partnership"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_partnerId_key" ON "Partnership"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_tokenHash_key" ON "Partnership"("tokenHash");

-- CreateIndex
CREATE INDEX "Partnership_status_idx" ON "Partnership"("status");

-- CreateIndex
CREATE INDEX "Partnership_tokenHash_idx" ON "Partnership"("tokenHash");

-- CreateIndex
CREATE INDEX "Partnership_inviteeEmail_idx" ON "Partnership"("inviteeEmail");

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
