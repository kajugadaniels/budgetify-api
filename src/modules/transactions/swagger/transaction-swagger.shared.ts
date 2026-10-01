import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';

export function ApiTransactionAuthentication(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiTransactionIdParameter(
  description: string,
): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name: 'transactionId',

      format: 'uuid',

      description,
    }),
  );
}
