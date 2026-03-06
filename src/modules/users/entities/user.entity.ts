import { UserStatus } from '@prisma/client';

export class UserEntity {
  id!: string;
  email!: string;
  firstName!: string | null;
  lastName!: string | null;
  fullName!: string | null;
  avatarUrl!: string | null;
  isEmailVerified!: boolean;
  status!: UserStatus;
  lastLoginAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
