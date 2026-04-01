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
        'Returns non-deleted expense records owned by the authenticated user for the requested month and year, ordered from newest to oldest by recorded date. When no query is provided, all expense records are returned.',
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
    ApiOkResponse({
      description: 'Expense records retrieved successfully.',
      type: ExpenseResponseDto,
      isArray: true,
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
        'Creates a new expense record for the authenticated user. Captures the expense label, amount in RWF, category, date, and an optional note.',
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
