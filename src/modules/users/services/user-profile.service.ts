import { BadRequestException, Injectable } from '@nestjs/common';

import { UpdateUserProfileRequestDto } from '../dto/update-user-profile.request.dto';
import { UserEntity } from '../entities/user.entity';
import { UserPrismaExecutor } from '../types/user-service.types';
import { UsersRepository } from '../users.repository';
import { UserQueryService } from './user-query.service';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,

    private readonly userQueryService: UserQueryService,
  ) {}

  async updateProfileNames(
    userId: string,
    payload: UpdateUserProfileRequestDto,
    db?: UserPrismaExecutor,
  ): Promise<UserEntity> {
    if (payload.firstName === undefined && payload.lastName === undefined) {
      throw new BadRequestException(
        'Provide at least one of firstName or lastName to update.',
      );
    }

    const user = await this.userQueryService.findActiveByIdOrThrow(userId, db);

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
