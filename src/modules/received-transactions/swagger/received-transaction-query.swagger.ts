import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { ReceivedTransactionListResponseDto } from '../dto/received-transaction-list.response.dto';
import { ReceivedTransactionResponseDto } from '../dto/received-transaction.response.dto';
import {
  ApiReceivedTransactionAuthentication,
  ApiReceivedTransactionIdParameter,
} from './received-transaction-swagger.shared';

export function ApiListReceivedTransactionsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiReceivedTransactionAuthentication(),

    ApiOperation({
      summary: 'List received transactions',

      description:
        'Returns received transactions owned by the authenticated user using newest provider occurrence time first. Results can be filtered by status, evidence source, classification, occurrence date range, and search text.',
    }),

    ApiOkResponse({
      description: 'Received transactions retrieved successfully.',

      type: ReceivedTransactionListResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Pagination or received transaction filters are invalid.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetReceivedTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiReceivedTransactionAuthentication(),

    ApiReceivedTransactionIdParameter(),

    ApiOperation({
      summary: 'Get received transaction details',
    }),

    ApiOkResponse({
      description: 'Received transaction retrieved successfully.',

      type: ReceivedTransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Received transaction ID is not a valid UUID.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description:
        'Received transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),
  );
}
