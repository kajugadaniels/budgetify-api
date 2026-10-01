import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { TransactionAnalyticsResponseDto } from '../dto/transaction-analytics.response.dto';
import { TransactionHistoryResponseDto } from '../dto/transaction-history.response.dto';
import { ApiTransactionAuthentication } from './transaction-swagger.shared';

export function ApiGetTransactionAnalyticsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

    ApiOperation({
      summary: 'Get sent and received money analytics',

      description:
        'Returns combined sent and received money analytics for the authenticated user over an inclusive date range. Outgoing monetary totals include transactions that are currently COMPLETED and whose completedAt timestamp falls inside the selected period. Received monetary totals include received transactions that are currently COMPLETED and whose occurredAt timestamp falls inside the period. Reversed transactions are excluded from monetary totals. Net cash movement is received money minus the full outgoing debit including fees. The response also includes lifecycle counts, outgoing completion provenance, received evidence provenance, outgoing category and transfer-type breakdowns, received classification breakdowns, and comparisons with the immediately preceding equal-length period.',
    }),

    ApiOkResponse({
      description: 'Money analytics retrieved successfully.',

      type: TransactionAnalyticsResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'Analytics dates are invalid or the from date occurs after the to date.',

      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetTransactionHistoryEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiTransactionAuthentication(),

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
  );
}
