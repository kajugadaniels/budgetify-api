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
import { CreateSavingDepositRequestDto } from './dto/create-saving-deposit.request.dto';
import { CreateSavingWithdrawalRequestDto } from './dto/create-saving-withdrawal.request.dto';
import { CreateSavingRequestDto } from './dto/create-saving.request.dto';
import { PaginatedSavingResponseDto } from './dto/paginated-saving.response.dto';
import { SavingResponseDto } from './dto/saving-response.dto';
import { SavingTransactionResponseDto } from './dto/saving-transaction.response.dto';
import { UpdateSavingRequestDto } from './dto/update-saving.request.dto';

export function ApiListCurrentUserSavingsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user saving records',
      description:
        'Returns non-deleted saving records owned by the authenticated user, ordered from newest to oldest by recorded date. Explicit dateFrom/dateTo filters override month and year, and text search matches the saving label and note when at least 3 characters are provided. When no query is provided, all saving records are returned.',
    }),
    ApiQuery({
      name: 'month',
      required: false,
      type: Number,
      example: 4,
      description:
        'Optional 1-based month filter applied against the recorded saving date.',
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
      name: 'search',
      required: false,
      type: String,
      example: 'trip',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the saving label and note.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-04-01',
      description:
        'Optional inclusive start date filter applied against the recorded saving date. Overrides month/year filtering when provided.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-15',
      description:
        'Optional inclusive end date filter applied against the recorded saving date. Overrides month/year filtering when provided.',
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
      description: 'Saving records retrieved successfully.',
      type: PaginatedSavingResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access saving records.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserSavingEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create a saving record',
      description:
        'Creates a new saving record for the authenticated user. Captures the saving label, amount, currency, date, optional note, and whether the money is still currently available.',
    }),
    ApiBody({ type: CreateSavingRequestDto }),
    ApiCreatedResponse({
      description: 'Saving record created successfully.',
      type: SavingResponseDto,
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
        'Authenticated user account is not allowed to create saving records.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many saving write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateCurrentUserSavingEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update a saving record',
      description:
        'Updates one existing saving record owned by the authenticated user. Only the editable saving fields are accepted: label, amount, date, note, and whether the saving is still currently available.',
    }),
    ApiParam({
      name: 'savingId',
      description: 'UUID of the saving record to update.',
      format: 'uuid',
    }),
    ApiBody({ type: UpdateSavingRequestDto }),
    ApiOkResponse({
      description: 'Saving record updated successfully.',
      type: SavingResponseDto,
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
        'Authenticated user account is not allowed to update saving records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested saving record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many saving write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiListCurrentUserSavingTransactionsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List saving transactions',
      description:
        'Returns the active ledger transactions for one visible saving record, including income source details for deposits.',
    }),
    ApiParam({
      name: 'savingId',
      description: 'UUID of the saving record.',
      format: 'uuid',
    }),
    ApiOkResponse({
      description: 'Saving transactions retrieved successfully.',
      type: SavingTransactionResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access saving transactions.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested saving record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserSavingDepositEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create a saving deposit',
      description:
        'Adds money to an existing saving record and records the income records that funded the deposit. Source amounts must equal the deposit amount after RWF conversion and cannot exceed remaining income availability.',
    }),
    ApiParam({
      name: 'savingId',
      description: 'UUID of the saving record receiving the deposit.',
      format: 'uuid',
    }),
    ApiBody({ type: CreateSavingDepositRequestDto }),
    ApiCreatedResponse({
      description: 'Saving deposit created successfully.',
      type: SavingResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, source totals do not match, or an income source is over-allocated.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to create saving deposits.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested saving or income source record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many saving write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserSavingWithdrawalEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create a saving withdrawal',
      description:
        'Pulls money out of an existing saving record, records a withdrawal transaction, and creates an available-money movement linked to that withdrawal. The withdrawal amount cannot exceed the current saving balance after RWF conversion.',
    }),
    ApiParam({
      name: 'savingId',
      description: 'UUID of the saving record receiving the withdrawal.',
      format: 'uuid',
    }),
    ApiBody({ type: CreateSavingWithdrawalRequestDto }),
    ApiCreatedResponse({
      description: 'Saving withdrawal created successfully.',
      type: SavingResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed or the withdrawal exceeds the current saving balance.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to create saving withdrawals.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested saving record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many saving write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCurrentUserSavingEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete a saving record',
      description:
        'Soft-deletes one saving record owned by the authenticated user so it no longer appears in standard saving listings.',
    }),
    ApiParam({
      name: 'savingId',
      description: 'UUID of the saving record to delete.',
      format: 'uuid',
    }),
    ApiNoContentResponse({
      description: 'Saving record deleted successfully.',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to delete saving records.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested saving record does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many saving write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}
