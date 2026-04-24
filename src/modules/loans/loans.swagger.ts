import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { LoanSettlementResponseDto } from './dto/loan-settlement-response.dto';
import { PaginatedLoanResponseDto } from './dto/paginated-loan.response.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { SendLoanToExpenseRequestDto } from './dto/send-loan-to-expense.request.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';

export function ApiListCurrentUserLoansEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user loan records',
      description:
        'Returns non-deleted loan records visible to the authenticated user, ordered from newest to oldest by issued date. Explicit dateFrom/dateTo filters override month and year, and text search matches the loan label and note when at least 3 characters are provided. Direction, type, and paid-state filters can be combined to narrow the ledger.',
    }),
    ApiQuery({
      name: 'month',
      required: false,
      type: Number,
      example: 3,
      description:
        'Optional 1-based month filter applied against the issued date.',
    }),
    ApiQuery({
      name: 'year',
      required: false,
      type: Number,
      example: 2026,
      description:
        'Optional year filter paired with month. Defaults to the current year.',
    }),
    ApiQuery({
      name: 'direction',
      required: false,
      type: String,
      example: 'BORROWED',
      description: 'Optional borrowed-versus-lent filter.',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      type: String,
      example: 'FAMILY',
      description: 'Optional loan purpose or relationship filter.',
    }),
    ApiQuery({
      name: 'paid',
      required: false,
      type: Boolean,
      example: false,
      description: 'Optional paid-state filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'rent',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the loan label and note.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-03-10',
      description:
        'Optional inclusive start date filter applied against the issued date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-03-25',
      description:
        'Optional inclusive end date filter applied against the issued date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Optional 1-based page number. Defaults to 1.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 12,
      description: 'Optional page size. Defaults to 12.',
    }),
    ApiOkResponse({
      description: 'Loan records retrieved successfully.',
      type: PaginatedLoanResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access loan records.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserLoanEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create a loan record',
      description:
        'Creates a new loan record for the authenticated user. Captures loan direction, type, counterparty details, amount and currency, issued and due dates, paid state, and an optional note.',
    }),
    ApiBody({ type: CreateLoanRequestDto }),
    ApiCreatedResponse({
      description: 'Loan record created successfully.',
      type: LoanResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Request validation failed.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to create loan records.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many loan write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateCurrentUserLoanEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update a loan record',
      description:
        'Updates one existing loan record owned by the authenticated user. Editable fields include the direction, type, counterparty details, amount and currency, issued and due dates, paid state, and note.',
    }),
    ApiParam({
      name: 'loanId',
      description: 'UUID of the loan record to update.',
      format: 'uuid',
    }),
    ApiBody({ type: UpdateLoanRequestDto }),
    ApiOkResponse({
      description: 'Loan record updated successfully.',
      type: LoanResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed or no updatable fields were provided.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update loan records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested loan record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many loan write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCurrentUserLoanEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete a loan record',
      description:
        'Soft-deletes one loan record owned by the authenticated user so it no longer appears in standard loan listings.',
    }),
    ApiParam({
      name: 'loanId',
      description: 'UUID of the loan record to delete.',
      format: 'uuid',
    }),
    ApiNoContentResponse({
      description: 'Loan record deleted successfully.',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to delete loan records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested loan record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many loan write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiSendCurrentUserLoanToExpenseEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Send a loan to expenses',
      description:
        'Creates one expense entry in the LOAN category from an unpaid borrowed loan record owned by the authenticated user, then marks that loan as paid inside the same transaction.',
    }),
    ApiParam({
      name: 'loanId',
      description: 'UUID of the loan record to settle into expenses.',
      format: 'uuid',
    }),
    ApiBody({ type: SendLoanToExpenseRequestDto }),
    ApiCreatedResponse({
      description: 'Loan was sent to expenses successfully and marked as paid.',
      type: LoanSettlementResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, the loan is already marked as paid, or the loan direction is not BORROWED.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to settle loan records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested loan record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many loan write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}
