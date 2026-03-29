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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';

export function ApiListCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user income records',
      description:
        'Returns all non-deleted income records owned by the authenticated user, ordered from newest to oldest by recorded date.',
    }),
    ApiOkResponse({
      description: 'Income records retrieved successfully.',
      type: IncomeResponseDto,
      isArray: true,
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

export function ApiCreateCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Create an income record',
      description:
        'Creates a new income record for the authenticated user using the same inputs captured by the Flutter income form: source label, amount, category, and date.',
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
  );
}

export function ApiUpdateCurrentUserIncomeEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Update an income record',
      description:
        'Updates one existing income record owned by the authenticated user. Only the editable income form fields are accepted: label, amount, category, and date.',
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
        'Request validation failed or no updatable fields were provided.',
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
  );
}
