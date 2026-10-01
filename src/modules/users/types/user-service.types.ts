import type { Prisma } from '@prisma/client';

import type { PrismaService } from '../../../database/prisma/prisma.service';

export type UserPrismaExecutor = Prisma.TransactionClient | PrismaService;

export interface UpsertGoogleUserInput {
  email: string;

  firstName: string | null;

  lastName: string | null;

  fullName: string | null;

  avatarUrl: string | null;

  isEmailVerified: boolean;
}

export interface UserAccountLifecycleOptions {
  db?: UserPrismaExecutor;

  cancelPendingDeletionOnActivity?: boolean;
}
