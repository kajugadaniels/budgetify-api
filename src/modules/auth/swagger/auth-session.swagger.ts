import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { UserProfileResponseDto } from '../../users/dto/user-profile-response.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LogoutRequestDto } from '../dto/logout.request.dto';
import { LogoutResponseDto } from '../dto/logout-response.dto';
import { RefreshTokenRequestDto } from '../dto/refresh-token.request.dto';
import { ApiAuthenticatedAuthEndpoint } from './auth-swagger.shared';

export function ApiRefreshEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh tokens',

      description:
        'Validates the refresh token, rotates the session, revokes the previous refresh session, and returns a fresh token pair.',
    }),

    ApiBody({
      type: RefreshTokenRequestDto,
    }),

    ApiOkResponse({
      description: 'Tokens rotated successfully.',

      type: AuthResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Request validation failed.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Refresh token is invalid, expired, or revoked.',

      type: ApiErrorResponseDto,
    }),

    ApiTooManyRequestsResponse({
      description: 'Too many refresh attempts.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiLogoutEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Logout',

      description:
        'Revokes the session associated with the provided refresh token.',
    }),

    ApiBody({
      type: LogoutRequestDto,
    }),

    ApiOkResponse({
      description: 'Logout completed successfully.',

      type: LogoutResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Request validation failed.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Refresh token is invalid or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiMeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiAuthenticatedAuthEndpoint(),

    ApiOperation({
      summary: 'Get current user',

      description:
        'Returns the authenticated user profile associated with the provided access token.',
    }),

    ApiOkResponse({
      description: 'Current authenticated user profile.',

      type: UserProfileResponseDto,
    }),
  );
}
