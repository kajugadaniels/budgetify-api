import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';

export function ApiAuthenticatedAuthEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}
