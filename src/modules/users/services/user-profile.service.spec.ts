import { BadRequestException } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';

import { UsersRepository } from '../users.repository';
import { UserProfileService } from './user-profile.service';
import { UserQueryService } from './user-query.service';

describe('UserProfileService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;

  let userQueryService: jest.Mocked<UserQueryService>;

  let service: UserProfileService;

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
      update: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    userQueryService = {
      findActiveByIdOrThrow: jest.fn(),
    } as unknown as jest.Mocked<UserQueryService>;

    service = new UserProfileService(usersRepository, userQueryService);
  });

  it('updates profile names and recomputes full name', async () => {
    const updated: User = {
      ...user,

      firstName: 'Aline',

      fullName: 'Aline Mutoni',
    };

    userQueryService.findActiveByIdOrThrow.mockResolvedValue(user);

    usersRepository.update.mockResolvedValue(updated);

    const result = await service.updateProfileNames(user.id, {
      firstName: 'Aline',
    });

    expect(usersRepository.update.mock.calls[0][1]).toEqual({
      firstName: 'Aline',

      lastName: 'Mutoni',

      fullName: 'Aline Mutoni',
    });

    expect(result).toEqual(updated);
  });

  it('requires at least one editable profile field', async () => {
    await expect(
      service.updateProfileNames(user.id, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userQueryService.findActiveByIdOrThrow.mock.calls).toHaveLength(0);
  });
});
