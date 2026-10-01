import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { PasswordChallengeResponseDto } from '../dto/password-challenge-response.dto';
import { PasswordChallengeVerifyRequestDto } from '../dto/password-challenge-verify.request.dto';
import { PasswordChallengeVerifyResponseDto } from '../dto/password-challenge-verify-response.dto';
import { PasswordLoginRequestDto } from '../dto/password-login.request.dto';
import { PasswordStatusRequestDto } from '../dto/password-status.request.dto';
import { PasswordStatusResponseDto } from '../dto/password-status-response.dto';
import { SetPasswordRequestDto } from '../dto/set-password.request.dto';
import { SetPasswordResponseDto } from '../dto/set-password-response.dto';
import { OTP_CODE_LENGTH } from '../constants/otp.constants';

export function ApiPasswordStatusEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Check whether an email has a password',

      description:
        'Returns the next password-authentication state without creating a session.',
    }),

    ApiBody({
      type: PasswordStatusRequestDto,
    }),

    ApiOkResponse({
      type: PasswordStatusResponseDto,
    }),

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

      description: `Sends a single-use ${OTP_CODE_LENGTH}-digit email OTP before password setup or recovery.`,
    }),

    ApiBody({
      type: PasswordStatusRequestDto,
    }),

    ApiOkResponse({
      type: PasswordChallengeResponseDto,
    }),

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

      description: `Consumes the ${OTP_CODE_LENGTH}-digit email OTP and returns a short-lived, single-use password grant.`,
    }),

    ApiBody({
      type: PasswordChallengeVerifyRequestDto,
    }),

    ApiOkResponse({
      type: PasswordChallengeVerifyResponseDto,
    }),

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

    ApiBody({
      type: SetPasswordRequestDto,
    }),

    ApiOkResponse({
      type: SetPasswordResponseDto,
    }),

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

    ApiBody({
      type: PasswordLoginRequestDto,
    }),

    ApiOkResponse({
      type: AuthResponseDto,
    }),

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
