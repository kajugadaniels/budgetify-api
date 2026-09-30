import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { TransactionAnalyticsResponseDto } from './dto/transaction-analytics.response.dto';
import { TransactionDetailResponseDto } from './dto/transaction-detail.response.dto';
import { TransactionListResponseDto } from './dto/transaction-list.response.dto';
import { TransactionQuoteResponseDto } from './dto/transaction-quote.response.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';
import { TransactionHistoryResponseDto } from './dto/transaction-history.response.dto';

export function ApiQuoteTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

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

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

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

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRecordUssdOpenedEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiParam({
      name: 'transactionId',

      format: 'uuid',

      description: 'Transaction that initiated the USSD transfer.',
    }),

    ApiOperation({
      summary: 'Record that a USSD transfer was opened',

      description:
        'Idempotently records a successful USSD launch from the mobile app. A pending transaction moves to processing. This endpoint does not mark the payment as completed.',
    }),

    ApiOkResponse({
      description: 'USSD launch recorded successfully.',

      type: TransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Transaction ID or client event ID is invalid.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description: 'Transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description:
        'The transaction is already in a terminal state or the client event ID was used for another event.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRecordProviderSmsResultEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiParam({
      name: 'transactionId',

      format: 'uuid',

      description: 'Transaction being reconciled with a provider SMS result.',
    }),

    ApiOperation({
      summary: 'Record a provider SMS transaction result',

      description:
        'Reconciles a pending or processing transaction with structured evidence extracted from a provider SMS. The raw SMS message is not stored.',
    }),

    ApiOkResponse({
      description: 'Provider result recorded successfully.',

      type: TransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'Provider result data is invalid or inconsistent.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description: 'Transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description:
        'The provider result conflicts with the transaction or has already been used elsewhere.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRecordManualResultEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiParam({
      name: 'transactionId',

      format: 'uuid',

      description: 'Transaction being manually confirmed by its owner.',
    }),

    ApiOperation({
      summary: 'Manually confirm a transaction result',

      description:
        'Allows the authenticated transaction owner to manually mark a pending or processing transaction as completed or failed. This is user-reported evidence and is recorded as a STATUS_CHANGED event from MOBILE_APP, not as a provider-confirmed result.',
    }),

    ApiOkResponse({
      description: 'Manual transaction result recorded successfully.',

      type: TransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'Transaction ID, client event ID, or manual status is invalid.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description: 'Transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description:
        'The transaction already has a final status or the client event ID belongs to another event.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetTransactionAnalyticsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Get transaction analytics',

      description:
        'Returns transaction analytics for the authenticated user over an inclusive date range. Monetary totals and breakdowns include only transactions that are currently COMPLETED and whose completedAt timestamp falls inside the period. Reversed, failed, cancelled, pending, and processing transactions never contribute to spending totals. The response also includes lifecycle status counts, confirmation provenance, category and transfer-type breakdowns, and comparison with the immediately preceding equal-length period.',
    }),

    ApiOkResponse({
      description: 'Transaction analytics retrieved successfully.',

      type: TransactionAnalyticsResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'Analytics dates are invalid or the from date occurs after the to date.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListTransactionsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

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

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiParam({
      name: 'transactionId',

      format: 'uuid',

      description: 'Transaction owned by the authenticated user.',
    }),

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

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetTransactionHistoryEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Get unified sent and received money history',

      description:
        'Returns a newest-first money timeline containing sent and received transactions. Direction, status, transfer type, search, and pagination are supported. Transfer type applies only to sent transactions.',
    }),

    ApiOkResponse({
      description: 'Unified money history retrieved successfully.',

      type: TransactionHistoryResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'History pagination or filter combination is invalid.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}
