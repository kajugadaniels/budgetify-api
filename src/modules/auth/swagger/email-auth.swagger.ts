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
import { EmailInitiateRequestDto } from '../dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from '../dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from '../dto/email-verify.request.dto';

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

    ApiBody({
      type: EmailInitiateRequestDto,
    }),

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

    ApiBody({
      type: EmailVerifyRequestDto,
    }),

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
