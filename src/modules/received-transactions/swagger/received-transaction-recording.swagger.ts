import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { ReceivedTransactionResponseDto } from '../dto/received-transaction.response.dto';
import { ApiReceivedTransactionAuthentication } from './received-transaction-swagger.shared';

export function ApiRecordReceivedProviderSmsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiReceivedTransactionAuthentication(),

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
  );
}

export function ApiRecordReceivedManualEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiReceivedTransactionAuthentication(),

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
  );
}
