import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { TransactionQuoteResponseDto } from '../dto/transaction-quote.response.dto';
import { TransactionResponseDto } from '../dto/transaction.response.dto';
import { ApiTransactionAuthentication } from './transaction-swagger.shared';

export function ApiQuoteTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiOperation({
      summary: 'Calculate a transaction fee',

      description:
        'Returns the server-calculated RWF fee and total debit for the selected transfer type.',
    }),

    ApiOkResponse({
      description: 'Transaction fee calculated successfully.',

      type: TransactionQuoteResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Amount or transfer type is invalid.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiOperation({
      summary: 'Create a pending transaction',

      description:
        'Recalculates the fee on the server and stores a pending transaction. Receiver name is intentionally left null until provider resolution is added.',
    }),

    ApiCreatedResponse({
      description: 'Pending transaction created successfully.',

      type: TransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Transaction details are invalid.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description: 'Idempotency key belongs to a different transaction.',

      type: ApiErrorResponseDto,
    }),
  );
}
