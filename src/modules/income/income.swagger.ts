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
import { IncomeCategoryOptionResponseDto } from './dto/income-category-option.response.dto';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { IncomeAllocationStatus } from './dto/income-allocation-status.enum';
import { IncomeDetailResponseDto } from './dto/income-detail.response.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { IncomeSummaryResponseDto } from './dto/income-summary.response.dto';
import { PaginatedIncomeResponseDto } from './dto/paginated-income.response.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';

export function ApiListIncomeCategoriesEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List income categories',
      description:
        'Returns the backend-defined income categories available for the income create and update forms.',
    }),
    ApiOkResponse({
      description: 'Income categories retrieved successfully.',
      type: IncomeCategoryOptionResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access income categories.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user income records',
      description:
        'Returns non-deleted income records owned by the authenticated user for the requested month and year, ordered from newest to oldest by recorded date. Explicit dateFrom/dateTo filters override month and year, and text search matches both the income label and income category when at least 3 characters are provided. When no query is provided, all income records are returned.',
    }),
    ApiQuery({
      name: 'month',
      required: false,
      type: Number,
      example: 3,
      description:
        'Optional 1-based month filter applied against the recorded income date.',
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
      example: 'SALARY',
      description: 'Optional income category filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'salary',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches both the income label and matching category names.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-03-10',
      description:
        'Optional inclusive start date filter applied against the recorded income date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-03-25',
      description:
        'Optional inclusive end date filter applied against the recorded income date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'received',
      required: false,
      type: Boolean,
      example: true,
      description: 'Optional received-state filter.',
    }),
    ApiQuery({
      name: 'allocationStatus',
      required: false,
      enum: IncomeAllocationStatus,
      example: IncomeAllocationStatus.PARTIALLY_ALLOCATED,
      description:
        'Optional allocation filter based on how much of the income has already been moved into savings.',
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
      description: 'Income records retrieved successfully.',
      type: PaginatedIncomeResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access income records.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiSummarizeCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Summarize current user income totals',
      description:
        'Returns period-level income totals for the authenticated user and visible partner context: total scheduled income, received income, pending income, expenses, current savings balance, and available money now. Explicit dateFrom/dateTo filters override month and year.',
    }),
    ApiQuery({
      name: 'month',
      required: false,
      type: Number,
      example: 3,
      description:
        'Optional 1-based month filter applied against recorded dates used in the summary.',
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
      example: '2026-03-10',
      description:
        'Optional inclusive start date filter. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-03-25',
      description:
        'Optional inclusive end date filter. Overrides month/year filtering when provided.',
    }),
    ApiOkResponse({
      description: 'Income summary retrieved successfully.',
      type: IncomeSummaryResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access income summary data.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetCurrentUserIncomeDetailEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Get one income record with allocation details',
      description:
        'Returns one visible income record together with how much of it has already been allocated into savings, how much is still free, and the list of saving buckets that used it.',
    }),
    ApiParam({
      name: 'incomeId',
      description: 'UUID of the income record to inspect.',
      format: 'uuid',
    }),
    ApiOkResponse({
      description: 'Income detail retrieved successfully.',
      type: IncomeDetailResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access this income record.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested income record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create an income record',
      description:
        'Creates a new income record for the authenticated user using the same inputs captured by the income form: source label, amount, category, date, and received state.',
    }),
    ApiBody({ type: CreateIncomeRequestDto }),
    ApiCreatedResponse({
      description: 'Income record created successfully.',
      type: IncomeResponseDto,
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
        'Authenticated user account is not allowed to create income records.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many income write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update an income record',
      description:
        'Updates one existing income record owned by the authenticated user. Only the editable income form fields are accepted: label, amount, category, date, and received state.',
    }),
    ApiParam({
      name: 'incomeId',
      description: 'UUID of the income record to update.',
      format: 'uuid',
    }),
    ApiBody({ type: UpdateIncomeRequestDto }),
    ApiOkResponse({
      description: 'Income record updated successfully.',
      type: IncomeResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, no updatable fields were provided, or the requested change would break existing savings allocations.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update income records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested income record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many income write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete an income record',
      description:
        'Soft-deletes one income record owned by the authenticated user so it no longer appears in standard income listings.',
    }),
    ApiParam({
      name: 'incomeId',
      description: 'UUID of the income record to delete.',
      format: 'uuid',
    }),
    ApiNoContentResponse({
      description: 'Income record deleted successfully.',
    }),
    ApiBadRequestResponse({
      description:
        'The income cannot be deleted because it already funds one or more saving deposits.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to delete income records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested income record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many income write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}
