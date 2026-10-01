import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';

export function ApiReceivedTransactionAuthentication(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiReceivedTransactionIdParameter(): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name: 'receivedTransactionId',

      format: 'uuid',

      description: 'Received transaction owned by the authenticated user.',
    }),
  );
}
