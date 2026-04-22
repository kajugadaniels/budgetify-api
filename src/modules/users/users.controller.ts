import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ALLOWED_PROFILE_AVATAR_MIME_TYPES,
  MAX_PROFILE_AVATAR_SIZE_BYTES,
} from './services/avatar-image-storage.service';
import type { AvatarUploadFile } from './services/avatar-image-storage.service';
import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UsersMapper } from './mappers/users.mapper';
import { USERS_ROUTES } from './users.routes';
import { UsersService } from './users.service';
import {
  ApiGetCurrentUserEndpoint,
  ApiRequestCurrentUserDeletionEndpoint,
  ApiUploadCurrentUserAvatarEndpoint,
  ApiUpdateCurrentUserEndpoint,
} from './users.swagger';

const profileAvatarInterceptor = FileInterceptor('avatar', {
  limits: {
    files: 1,
    fileSize: MAX_PROFILE_AVATAR_SIZE_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    if (ALLOWED_PROFILE_AVATAR_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new BadRequestException(
        'Only JPEG, PNG, and WebP profile images are supported.',
      ),
      false,
    );
  },
});

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

  @Patch(USERS_ROUTES.avatar)
  @UseInterceptors(profileAvatarInterceptor)
  @ApiUploadCurrentUserAvatarEndpoint()
  async uploadCurrentUserAvatar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @UploadedFile() file?: AvatarUploadFile,
  ): Promise<UserProfileResponseDto> {
    const updatedUser = await this.usersService.updateProfileAvatar(
      user.userId,
      file,
    );

    return UsersMapper.toUserProfileResponse(updatedUser);
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

  @Post(USERS_ROUTES.deletionRequest)
  @ApiRequestCurrentUserDeletionEndpoint()
  async requestCurrentUserDeletion(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<UserProfileResponseDto> {
    const updatedUser = await this.usersService.requestAccountDeletion(
      user.userId,
    );

    return UsersMapper.toUserProfileResponse(updatedUser);
  }
}
