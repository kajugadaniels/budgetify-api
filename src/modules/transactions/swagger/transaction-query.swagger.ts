import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { TransactionDetailResponseDto } from '../dto/transaction-detail.response.dto';
import { TransactionListResponseDto } from '../dto/transaction-list.response.dto';
import {
  ApiTransactionAuthentication,
  ApiTransactionIdParameter,
} from './transaction-swagger.shared';

export function ApiListTransactionsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiOperation({
      summary: 'List transaction history',

      description:
        'Returns the authenticated user transaction history using newest-first pagination. Results can be filtered by status, transfer type, recipient type, category, creation date range, and search text.',
    }),

    ApiOkResponse({
      description: 'Transaction history retrieved successfully.',

      type: TransactionListResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Pagination or transaction filters are invalid.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiTransactionIdParameter('Transaction owned by the authenticated user.'),

    ApiOperation({
      summary: 'Get transaction details',

      description:
        'Returns a transaction together with its chronological immutable lifecycle event timeline.',
    }),

    ApiOkResponse({
      description: 'Transaction details retrieved successfully.',

      type: TransactionDetailResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Transaction ID is not a valid UUID.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description: 'Transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),
  );
}
