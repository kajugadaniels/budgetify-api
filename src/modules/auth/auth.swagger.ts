import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { UserProfileResponseDto } from '../users/dto/user-profile-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';

export function ApiGoogleAuthEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Authenticate with Google',
      description:
        'Verifies the Google ID token server-side, links or creates the user, creates a session, and returns first-party JWT tokens.',
    }),
    ApiBody({ type: GoogleAuthRequestDto }),
    ApiOkResponse({
      description: 'Authentication completed successfully.',
      type: AuthResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Google ID token is invalid, expired, or not allowed.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many authentication attempts.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRefreshEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh tokens',
      description:
        'Validates the refresh token, rotates the session, revokes the previous refresh session, and returns a fresh token pair.',
    }),
    ApiBody({ type: RefreshTokenRequestDto }),
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
    ApiBody({ type: LogoutRequestDto }),
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
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Get current user',
      description:
        'Returns the authenticated user profile associated with the provided access token.',
    }),
    ApiOkResponse({
      description: 'Current authenticated user profile.',
      type: UserProfileResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
  );
}
