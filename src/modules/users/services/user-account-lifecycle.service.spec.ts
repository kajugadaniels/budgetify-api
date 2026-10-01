import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { UserAccountDeletionRepository } from '../repositories/user-account-deletion.repository';
import { UsersRepository } from '../users.repository';
import { UserAccountLifecycleService } from './user-account-lifecycle.service';

describe('UserAccountLifecycleService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;

  let deletionRepository: jest.Mocked<UserAccountDeletionRepository>;

  let prisma: jest.Mocked<PrismaService>;

  let emailService: jest.Mocked<EmailService>;

  let service: UserAccountLifecycleService;

  const user: User = {
    id: '4f94001f-a312-46b8-851e-0ac57e032025',

    email: 'alice@example.com',

    firstName: 'Alice',

    lastName: 'Mutoni',

    fullName: 'Alice Mutoni',

    avatarUrl: null,

    isEmailVerified: true,

    status: UserStatus.ACTIVE,

    lastLoginAt: null,

    accountDeletionRequestedAt: null,

    accountDeletionScheduledFor: null,

    createdAt: new Date('2026-09-01T08:00:00.000Z'),

    updatedAt: new Date('2026-10-01T08:00:00.000Z'),

    deletedAt: null,
  };

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn(),

      update: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    deletionRepository = {
      findIdsDueForDeletion: jest.fn(),

      revokeSessions: jest.fn(),

      revokePartnerships: jest.fn(),
    } as unknown as jest.Mocked<UserAccountDeletionRepository>;

    prisma = {
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    emailService = {
      sendAccountDeletionRequestEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    service = new UserAccountLifecycleService(
      usersRepository,
      deletionRepository,
      prisma,
      emailService,
    );
  });

  it('cancels a future deletion request on authenticated activity', async () => {
    const pending: User = {
      ...user,

      accountDeletionRequestedAt: new Date(),

      accountDeletionScheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    usersRepository.update.mockResolvedValue({
      ...pending,

      accountDeletionRequestedAt: null,

      accountDeletionScheduledFor: null,
    });

    const result = await service.resolve(pending, {
      cancelPendingDeletionOnActivity: true,
    });

    expect(usersRepository.update.mock.calls[0][1]).toEqual({
      accountDeletionRequestedAt: null,

      accountDeletionScheduledFor: null,
    });

    expect(result?.accountDeletionScheduledFor).toBeNull();
  });

  it('schedules account deletion for an active user', async () => {
    usersRepository.findById.mockResolvedValue(user);

    usersRepository.update.mockImplementation((_id, data) =>
      Promise.resolve({
        ...user,

        accountDeletionRequestedAt: data.accountDeletionRequestedAt as Date,

        accountDeletionScheduledFor: data.accountDeletionScheduledFor as Date,
      } as User),
    );

    emailService.sendAccountDeletionRequestEmail.mockResolvedValue(undefined);

    const result = await service.requestAccountDeletion(user.id);

    expect(result.accountDeletionRequestedAt).not.toBeNull();

    expect(result.accountDeletionScheduledFor).not.toBeNull();

    expect(
      emailService.sendAccountDeletionRequestEmail.mock.calls,
    ).toHaveLength(1);
  });

  it('returns the existing user when deletion is already scheduled', async () => {
    const pending: User = {
      ...user,

      accountDeletionRequestedAt: new Date(),

      accountDeletionScheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    usersRepository.findById.mockResolvedValue(pending);

    const result = await service.requestAccountDeletion(pending.id);

    expect(result).toEqual(pending);

    expect(usersRepository.update.mock.calls).toHaveLength(0);
  });

  it('rejects deletion requests for a disabled account', async () => {
    usersRepository.findById.mockResolvedValue({
      ...user,

      status: UserStatus.DISABLED,
    });

    await expect(
      service.requestAccountDeletion(user.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for a missing account', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      service.requestAccountDeletion(user.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
