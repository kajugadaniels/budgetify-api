CREATE TABLE "UserPassword" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "passwordSalt" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'scrypt',
  "version" INTEGER NOT NULL DEFAULT 1,
  "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPassword_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserPassword_algorithm_check" CHECK ("algorithm" = 'scrypt'),
  CONSTRAINT "UserPassword_version_check" CHECK ("version" > 0)
);

CREATE TABLE "PasswordSetupGrant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordSetupGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPassword_userId_key" ON "UserPassword"("userId");
CREATE INDEX "UserPassword_passwordChangedAt_idx"
ON "UserPassword"("passwordChangedAt");

CREATE UNIQUE INDEX "PasswordSetupGrant_tokenHash_key"
ON "PasswordSetupGrant"("tokenHash");
CREATE INDEX "PasswordSetupGrant_userId_consumedAt_idx"
ON "PasswordSetupGrant"("userId", "consumedAt");
CREATE INDEX "PasswordSetupGrant_expiresAt_idx"
ON "PasswordSetupGrant"("expiresAt");

ALTER TABLE "UserPassword"
ADD CONSTRAINT "UserPassword_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordSetupGrant"
ADD CONSTRAINT "PasswordSetupGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
