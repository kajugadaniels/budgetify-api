import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { ReceivedTransactionListResponseDto } from './dto/received-transaction-list.response.dto';
import { ReceivedTransactionResponseDto } from './dto/received-transaction.response.dto';

export function ApiRecordReceivedProviderSmsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Record an incoming payment from structured SMS evidence',

      description:
        'Creates or idempotently returns an incoming transaction from structured data parsed by the mobile app from a provider SMS. Raw SMS content is never required or stored. PROVIDER_SMS is client-supplied evidence and must not be interpreted as independent provider verification.',
    }),

    ApiOkResponse({
      description:
        'Incoming payment evidence recorded successfully or an existing matching record returned.',

      type: ReceivedTransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'Incoming payment evidence is invalid, lacks sender information, or contains an invalid future timestamp.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description:
        'The client event ID or provider reference conflicts with different incoming transaction evidence.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiRecordReceivedManualEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Manually record a received payment',

      description:
        'Records a user-reported incoming payment. This is primarily the fallback for platforms such as iOS where Budgetify cannot inspect the SMS inbox. The transaction is stored as COMPLETED, UNCLASSIFIED, and MANUAL. Manual evidence must not be interpreted as independent provider verification.',
    }),

    ApiOkResponse({
      description:
        'Received payment recorded successfully or an idempotent matching record returned.',

      type: ReceivedTransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'The received payment is invalid, lacks sender information, or contains an invalid future timestamp.',

      type: ApiErrorResponseDto,
    }),

    ApiConflictResponse({
      description:
        'The client event ID or provider reference belongs to different received-payment data.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListReceivedTransactionsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

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

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetReceivedTransactionEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiParam({
      name: 'receivedTransactionId',

      format: 'uuid',

      description: 'Received transaction owned by the authenticated user.',
    }),

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

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateReceivedTransactionClassificationEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiParam({
      name: 'receivedTransactionId',

      format: 'uuid',

      description: 'Received transaction owned by the authenticated user.',
    }),

    ApiOperation({
      summary: 'Classify a received payment',

      description:
        'Updates the user-managed financial classification of a received payment. Classification may be changed between UNCLASSIFIED, INCOME, REIMBURSEMENT, LOAN_REPAYMENT, OWN_TRANSFER, and OTHER. This operation does not alter the transaction amount, status, occurrence time, sender information, provider reference, or evidence source.',
    }),

    ApiOkResponse({
      description: 'Received payment classification updated successfully.',

      type: ReceivedTransactionResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'The received transaction ID or classification value is invalid.',

      type: ApiErrorResponseDto,
    }),

    ApiNotFoundResponse({
      description:
        'Received transaction was not found for the authenticated user.',

      type: ApiErrorResponseDto,
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',

      type: ApiErrorResponseDto,
    }),
  );
}
