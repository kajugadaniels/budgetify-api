import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';

import { UsersRepository } from '../users.repository';
import { UserAccountLifecycleService } from './user-account-lifecycle.service';
import { UserQueryService } from './user-query.service';

describe('UserQueryService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;

  let accountLifecycleService: jest.Mocked<UserAccountLifecycleService>;

  let service: UserQueryService;

  const user: User = {
    id: '4f94001f-a312-46b8-851e-0ac57e032025',

    email: 'alice@example.com',

    firstName: 'Alice',

    lastName: 'Mutoni',

    fullName: 'Alice Mutoni',

    avatarUrl: null,

    isEmailVerified: true,

    status: UserStatus.ACTIVE,

    lastLoginAt: new Date('2026-10-01T08:00:00.000Z'),

    accountDeletionRequestedAt: null,

    accountDeletionScheduledFor: null,

    createdAt: new Date('2026-09-01T08:00:00.000Z'),

    updatedAt: new Date('2026-10-01T08:00:00.000Z'),

    deletedAt: null,
  };

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn(),

      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    accountLifecycleService = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<UserAccountLifecycleService>;

    service = new UserQueryService(usersRepository, accountLifecycleService);
  });

  it('returns an active user by id', async () => {
    usersRepository.findById.mockResolvedValue(user);

    accountLifecycleService.resolve.mockResolvedValue(user);

    await expect(service.findActiveByIdOrThrow(user.id)).resolves.toEqual(user);
  });

  it('returns null when an email does not belong to an active user', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(service.findActiveByEmail(user.email)).resolves.toBeNull();

    expect(accountLifecycleService.resolve.mock.calls).toHaveLength(0);
  });

  it('cancels pending deletion when authenticated activity is recorded', async () => {
    usersRepository.findById.mockResolvedValue(user);

    accountLifecycleService.resolve.mockResolvedValue(user);

    await service.recordAuthenticatedActivityOrThrow(user.id);

    expect(accountLifecycleService.resolve.mock.calls[0][1]).toEqual({
      db: undefined,

      cancelPendingDeletionOnActivity: true,
    });
  });

  it('returns not found when account lifecycle finalizes the user', async () => {
    usersRepository.findById.mockResolvedValue(user);

    accountLifecycleService.resolve.mockResolvedValue(null);

    await expect(service.findActiveByIdOrThrow(user.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a non-active account', async () => {
    const suspended: User = {
      ...user,

      status: UserStatus.SUSPENDED,
    };

    usersRepository.findById.mockResolvedValue(suspended);

    accountLifecycleService.resolve.mockResolvedValue(suspended);

    await expect(
      service.findActiveByIdOrThrow(suspended.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
