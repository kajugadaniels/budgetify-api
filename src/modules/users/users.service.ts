import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';

import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';
import {
  AvatarImageStorageService,
  AvatarUploadFile,
} from './services/avatar-image-storage.service';
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
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly avatarImageStorageService: AvatarImageStorageService,
  ) {}

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

  /**
   * Creates a new active user from a successfully verified email OTP.
   * The email is marked as verified because the OTP proves ownership.
   * Called inside a Prisma transaction — do not call outside of one.
   */
  async createFromEmailVerification(
    email: string,
    db?: PrismaExecutor,
  ): Promise<User> {
    return this.usersRepository.create(
      {
        email: email.toLowerCase(),
        isEmailVerified: true,
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

  async updateProfileNames(
    userId: string,
    payload: UpdateUserProfileRequestDto,
    db?: PrismaExecutor,
  ): Promise<UserEntity> {
    if (payload.firstName === undefined && payload.lastName === undefined) {
      throw new BadRequestException(
        'Provide at least one of firstName or lastName to update.',
      );
    }

    const user = await this.findActiveByIdOrThrow(userId);

    const nextFirstName = payload.firstName ?? user.firstName;
    const nextLastName = payload.lastName ?? user.lastName;

    return this.usersRepository.update(
      user.id,
      {
        firstName: nextFirstName,
        lastName: nextLastName,
        fullName: this.buildFullName(nextFirstName, nextLastName),
      },
      db,
    );
  }

  async updateProfileAvatar(
    userId: string,
    file: AvatarUploadFile | undefined,
    db?: PrismaExecutor,
  ): Promise<UserEntity> {
    if (!file) {
      throw new BadRequestException('Provide a profile image to update.');
    }

    const user = await this.findActiveByIdOrThrow(userId);
    const displayName = user.fullName ?? user.email;
    const uploadedAvatar = await this.avatarImageStorageService.uploadAvatar({
      userId: user.id,
      displayName,
      file,
    });

    return this.usersRepository.update(
      user.id,
      {
        avatarUrl: uploadedAvatar.imageUrl,
      },
      db,
    );
  }

  private assertUserCanAuthenticate(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not allowed to sign in.');
    }
  }

  private buildFullName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string | null {
    const parts = [firstName, lastName].filter((value): value is string =>
      Boolean(value && value.trim().length > 0),
    );

    return parts.length === 0 ? null : parts.join(' ');
  }
}
