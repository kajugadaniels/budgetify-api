import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { TransactionResponseDto } from '../dto/transaction.response.dto';
import {
  ApiTransactionAuthentication,
  ApiTransactionIdParameter,
} from './transaction-swagger.shared';

export function ApiRecordUssdOpenedEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiTransactionIdParameter('Transaction that initiated the USSD transfer.'),

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
  );
}

export function ApiRecordProviderSmsResultEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiTransactionIdParameter(
      'Transaction being reconciled with provider SMS evidence.',
    ),

    ApiOperation({
      summary: 'Record provider SMS transaction evidence',

      description:
        'Reconciles a pending or processing transaction with structured evidence parsed by the mobile app from a provider SMS. Raw SMS content is not stored. This client-observed SMS evidence must not be interpreted as independent provider API verification.',
    }),

    ApiOkResponse({
      description: 'SMS transaction evidence recorded successfully.',

      type: TransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'SMS evidence is invalid or inconsistent.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description: 'Transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description:
        'The SMS evidence conflicts with the transaction or has already been used elsewhere.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRecordManualResultEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiTransactionIdParameter(
      'Transaction being manually confirmed by its owner.',
    ),

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
  );
}
