import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';

export function ApiUpdateCurrentUserEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update current user profile',
      description:
        "Updates the authenticated user's first and last name. " +
        'The backend recomputes the full name automatically.',
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

export function ApiRequestCurrentUserDeletionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Request current user account deletion',
      description:
        "Schedules the authenticated user's account for deletion in 30 days. " +
        'Later authenticated activity automatically cancels the request.',
    }),
    ApiOkResponse({
      description: 'Account deletion was scheduled successfully.',
      type: UserProfileResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to request deletion.',
      type: ApiErrorResponseDto,
    }),
  );
}
