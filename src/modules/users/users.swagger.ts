import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { UploadUserAvatarRequestDto } from './dto/upload-user-avatar.request.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';

export function ApiUpdateCurrentUserEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update current user profile',
      description:
        "Updates the authenticated user's editable profile fields. " +
        'Only `firstName` and `lastName` are accepted. ' +
        'The backend recomputes `fullName` automatically from the stored name parts.',
    }),
    ApiBody({ type: UpdateUserProfileRequestDto }),
    ApiOkResponse({
      description: 'Profile updated successfully.',
      type: UserProfileResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed or no editable profile fields were provided.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update profile data.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetCurrentUserEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Get current user profile',
      description:
        "Returns the authenticated user's current profile information.",
    }),
    ApiOkResponse({
      description: 'Current user profile returned successfully.',
      type: UserProfileResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access profile data.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUploadCurrentUserAvatarEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Upload current user avatar',
      description:
        "Uploads and replaces the authenticated user's profile image. " +
        'The avatar is cropped to a square asset and stored in Cloudinary.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({ type: UploadUserAvatarRequestDto }),
    ApiOkResponse({
      description: 'Profile avatar updated successfully.',
      type: UserProfileResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed or the uploaded image is invalid.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update profile data.',
      type: ApiErrorResponseDto,
    }),
  );
}
