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
import { TransactionQuoteResponseDto } from './dto/transaction-quote.response.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';

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
