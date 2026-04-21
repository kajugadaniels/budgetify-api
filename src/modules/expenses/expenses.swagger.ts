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
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ExpenseSummaryResponseDto } from './dto/expense-summary.response.dto';
import { PaginatedExpenseResponseDto } from './dto/paginated-expense.response.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';

export function ApiListExpenseCategoriesEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List expense categories',
      description:
        'Returns the supported expense categories that can be used when creating or updating an expense record.',
    }),
    ApiOkResponse({
      description: 'Expense categories retrieved successfully.',
      type: ExpenseCategoryOptionResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access expense categories.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListCurrentUserExpensesEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user expense records',
      description:
        'Returns non-deleted expense records owned by the authenticated user for the requested month and year, ordered from newest to oldest by recorded date. Explicit dateFrom/dateTo filters override month and year, and text search matches the expense label, note, and matching category names when at least 3 characters are provided. When no query is provided, all expense records are returned.',
    }),
    ApiQuery({
      name: 'month',
      required: false,
      type: Number,
      example: 3,
      description:
        'Optional 1-based month filter applied against the recorded expense date.',
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
      name: 'category',
      required: false,
      type: String,
      example: 'FOOD_DINING',
      description: 'Optional expense category filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'food',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the expense label, note, and matching category names.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-03-10',
      description:
        'Optional inclusive start date filter applied against the recorded expense date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-03-25',
      description:
        'Optional inclusive end date filter applied against the recorded expense date. Overrides month/year filtering when provided.',
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
      description: 'Expense records retrieved successfully.',
      type: PaginatedExpenseResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access expense records.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserExpenseEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create an expense record',
      description:
        'Creates a new expense record for the authenticated user. Captures the base amount, payment method, optional mobile money metadata, calculated fee totals, category, date, and an optional note.',
    }),
    ApiBody({ type: CreateExpenseRequestDto }),
    ApiCreatedResponse({
      description: 'Expense record created successfully.',
      type: ExpenseResponseDto,
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
        'Authenticated user account is not allowed to create expense records.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many expense write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiSummarizeCurrentUserExpensesEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Summarize current user expenses',
      description:
        'Returns period expense totals, payment fee totals, charged totals, largest expense, average expense, and the current available money figure for the authenticated user scope.',
    }),
    ApiQuery({
      name: 'month',
      required: false,
      type: Number,
      example: 4,
      description:
        'Optional 1-based month filter applied against the recorded expense date.',
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
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-04-01',
      description:
        'Optional inclusive start date filter applied against the recorded expense date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-30',
      description:
        'Optional inclusive end date filter applied against the recorded expense date. Overrides month/year filtering when provided.',
    }),
    ApiOkResponse({
      description: 'Expense summary retrieved successfully.',
      type: ExpenseSummaryResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access expense summaries.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateCurrentUserExpenseEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update an expense record',
      description:
        'Updates one existing expense record owned by the authenticated user. All fields are optional — only the supplied fields are changed.',
    }),
    ApiParam({
      name: 'expenseId',
      description: 'UUID of the expense record to update.',
      format: 'uuid',
    }),
    ApiBody({ type: UpdateExpenseRequestDto }),
    ApiOkResponse({
      description: 'Expense record updated successfully.',
      type: ExpenseResponseDto,
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
        'Authenticated user account is not allowed to update expense records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested expense record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many expense write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCurrentUserExpenseEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete an expense record',
      description:
        'Soft-deletes one expense record owned by the authenticated user so it no longer appears in standard expense listings.',
    }),
    ApiParam({
      name: 'expenseId',
      description: 'UUID of the expense record to delete.',
      format: 'uuid',
    }),
    ApiNoContentResponse({
      description: 'Expense record deleted successfully.',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to delete expense records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested expense record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many expense write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}
