import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../../common/dto/api-error-response.dto';
import { ReceivedTransactionResponseDto } from '../dto/received-transaction.response.dto';
import {
  ApiReceivedTransactionAuthentication,
  ApiReceivedTransactionIdParameter,
} from './received-transaction-swagger.shared';

export function ApiUpdateReceivedTransactionClassificationEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiReceivedTransactionAuthentication(),

    ApiReceivedTransactionIdParameter(),

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
  );
}
