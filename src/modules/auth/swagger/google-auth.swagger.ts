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
import { AuthResponseDto } from '../dto/auth-response.dto';
import { GoogleAuthRequestDto } from '../dto/google-auth.request.dto';

export function ApiGoogleAuthEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Authenticate with Google',

      description:
        'Verifies the Google ID token server-side, links or creates the user, creates a session, and returns first-party JWT tokens.',
    }),

    ApiBody({
      type: GoogleAuthRequestDto,
    }),

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
