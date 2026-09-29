import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { UserProfileResponseDto } from '../users/dto/user-profile-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailInitiateRequestDto } from './dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from './dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from './dto/email-verify.request.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { PasswordChallengeResponseDto } from './dto/password-challenge-response.dto';
import { PasswordChallengeVerifyRequestDto } from './dto/password-challenge-verify.request.dto';
import { PasswordChallengeVerifyResponseDto } from './dto/password-challenge-verify-response.dto';
import { PasswordLoginRequestDto } from './dto/password-login.request.dto';
import { PasswordStatusRequestDto } from './dto/password-status.request.dto';
import { PasswordStatusResponseDto } from './dto/password-status-response.dto';
import { SetPasswordRequestDto } from './dto/set-password.request.dto';
import { SetPasswordResponseDto } from './dto/set-password-response.dto';

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

export function ApiEmailInitiateEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate email OTP authentication',
      description:
        'Accepts an email address and dispatches a 6-digit OTP. ' +
        'If the email belongs to an existing account, a sign-in OTP is sent. ' +
        'If the email is new, the address is registered as a pending user and an ' +
        'onboarding OTP is sent. The "action" field in the response tells the ' +
        'client which flow to render next.',
    }),
    ApiBody({ type: EmailInitiateRequestDto }),
    ApiOkResponse({
      description: 'OTP dispatched. Proceed to the verify step.',
      type: EmailInitiateResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed.',
      type: ApiErrorResponseDto,
    }),
    ApiServiceUnavailableResponse({
      description: 'Email delivery failed. Please try again shortly.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many OTP requests. Please wait before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiEmailVerifyEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify email OTP and complete authentication',
      description:
        'Validates the 6-digit OTP for the given email. ' +
        'For returning users, creates a session and returns JWT tokens. ' +
        'For new users, finalises account creation and returns JWT tokens. ' +
        'The OTP is deleted on success and is single-use.',
    }),
    ApiBody({ type: EmailVerifyRequestDto }),
    ApiOkResponse({
      description: 'OTP verified. Authentication complete.',
      type: AuthResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed or max attempts exceeded.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'OTP is invalid or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many verify attempts.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiPasswordStatusEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Check whether an email has a password',
      description:
        'Returns the next password-authentication state without creating a session.',
    }),
    ApiBody({ type: PasswordStatusRequestDto }),
    ApiOkResponse({ type: PasswordStatusResponseDto }),
    ApiBadRequestResponse({
      description: 'The email address is invalid.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many account checks.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiPasswordChallengeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Request a password setup or recovery code',
      description:
        'Sends a single-use email OTP before password setup or recovery.',
    }),
    ApiBody({ type: PasswordStatusRequestDto }),
    ApiOkResponse({ type: PasswordChallengeResponseDto }),
    ApiBadRequestResponse({
      description: 'The email address is invalid.',
      type: ApiErrorResponseDto,
    }),
    ApiServiceUnavailableResponse({
      description: 'The verification email could not be delivered.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many verification-code requests.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiPasswordChallengeVerifyEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify a password setup or recovery code',
      description:
        'Consumes the email OTP and returns a short-lived, single-use password grant.',
    }),
    ApiBody({ type: PasswordChallengeVerifyRequestDto }),
    ApiOkResponse({ type: PasswordChallengeVerifyResponseDto }),
    ApiBadRequestResponse({
      description: 'Request validation failed or max attempts were exceeded.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'The OTP is invalid or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many verification attempts.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiSetPasswordEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Create or reset a password',
      description:
        'Consumes a verified password grant, stores a scrypt password credential, and revokes existing sessions.',
    }),
    ApiBody({ type: SetPasswordRequestDto }),
    ApiOkResponse({ type: SetPasswordResponseDto }),
    ApiBadRequestResponse({
      description: 'The password is weak or confirmation does not match.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'The password grant is invalid, expired, or already used.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many password-change attempts.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiPasswordLoginEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Authenticate with email and password',
      description:
        'Verifies the password using scrypt and creates a first-party session.',
    }),
    ApiBody({ type: PasswordLoginRequestDto }),
    ApiOkResponse({ type: AuthResponseDto }),
    ApiBadRequestResponse({
      description: 'Request validation failed.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Email or password is incorrect.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many sign-in attempts.',
      type: ApiErrorResponseDto,
    }),
  );
}
