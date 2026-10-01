import { ForbiddenException } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';

export function assertUserCanAuthenticate(user: Pick<User, 'status'>): void {
  if (user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenException('User account is not allowed to sign in.');
  }
}
