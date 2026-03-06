import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';

import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

interface UpsertGoogleUserInput {
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
}

type PrismaExecutor = Prisma.TransactionClient | undefined;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findActiveByIdOrThrow(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user || user.deletedAt) {
      throw new NotFoundException('Authenticated user no longer exists.');
    }

    this.assertUserCanAuthenticate(user);

    return user;
  }

  async findActiveByEmail(
    email: string,
    db?: PrismaExecutor,
  ): Promise<User | null> {
    const user = await this.usersRepository.findByEmail(email, db);

    if (!user || user.deletedAt) {
      return null;
    }

    this.assertUserCanAuthenticate(user);

    return user;
  }

  async createFromGoogleProfile(
    profile: UpsertGoogleUserInput,
    db?: PrismaExecutor,
  ): Promise<User> {
    return this.usersRepository.create(
      {
        email: profile.email.toLowerCase(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        isEmailVerified: profile.isEmailVerified,
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
      },
      db,
    );
  }

  async updateFromGoogleLogin(
    user: User,
    profile: UpsertGoogleUserInput,
    db?: PrismaExecutor,
  ): Promise<User> {
    this.assertUserCanAuthenticate(user);

    return this.usersRepository.update(
      user.id,
      {
        firstName: profile.firstName ?? user.firstName,
        lastName: profile.lastName ?? user.lastName,
        fullName: profile.fullName ?? user.fullName,
        avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        isEmailVerified: user.isEmailVerified || profile.isEmailVerified,
        lastLoginAt: new Date(),
      },
      db,
    );
  }

  private assertUserCanAuthenticate(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not allowed to sign in.');
    }
  }
}
