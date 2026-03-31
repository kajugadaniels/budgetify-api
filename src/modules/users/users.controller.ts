import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UsersMapper } from './mappers/users.mapper';
import { USERS_ROUTES } from './users.routes';
import { UsersService } from './users.service';
import {
  ApiGetCurrentUserEndpoint,
  ApiUpdateCurrentUserEndpoint,
} from './users.swagger';

@ApiTags('Users')
@Controller(USERS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(USERS_ROUTES.me)
  @ApiGetCurrentUserEndpoint()
  async getCurrentUser(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<UserProfileResponseDto> {
    const currentUser = await this.usersService.findActiveByIdOrThrow(
      user.userId,
    );

    return UsersMapper.toUserProfileResponse(currentUser);
  }

  @Patch(USERS_ROUTES.me)
  @ApiUpdateCurrentUserEndpoint()
  async updateCurrentUser(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: UpdateUserProfileRequestDto,
  ): Promise<UserProfileResponseDto> {
    const updatedUser = await this.usersService.updateProfileNames(
      user.userId,
      body,
    );

    return UsersMapper.toUserProfileResponse(updatedUser);
  }
}
