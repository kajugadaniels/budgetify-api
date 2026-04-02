import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TodoFrequency, TodoPriority } from '@prisma/client';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { PaginatedTodoResponseDto } from './dto/paginated-todo.response.dto';
import { TodoResponseDto } from './dto/todo-response.dto';

function createTodoMultipartSchema(
  requiredImages: boolean,
): Record<string, unknown> {
  return {
    type: 'object',
    required: requiredImages
      ? ['name', 'price', 'priority', 'images']
      : undefined,
    properties: {
      name: {
        type: 'string',
        maxLength: 120,
        example: 'Renew car insurance',
      },
      price: {
        type: 'number',
        example: 85000,
      },
      priority: {
        type: 'string',
        enum: Object.values(TodoPriority),
        example: TodoPriority.TOP_PRIORITY,
      },
      done: {
        type: 'boolean',
        example: false,
        default: false,
      },
      frequency: {
        type: 'string',
        enum: Object.values(TodoFrequency),
        example: TodoFrequency.WEEKLY,
        default: TodoFrequency.ONCE,
      },
      startDate: {
        type: 'string',
        format: 'date',
        example: '2026-04-02',
      },
      endDate: {
        type: 'string',
        format: 'date',
        example: '2026-04-09',
        description:
          'Optional in requests. The backend derives it from startDate and frequency.',
      },
      frequencyDays: {
        type: 'array',
        items: {
          type: 'number',
        },
        example: [1, 3, 5],
        description: 'Weekly recurrence days only. Uses 0 (Sun) – 6 (Sat).',
      },
      occurrenceDates: {
        type: 'array',
        items: {
          type: 'string',
          format: 'date',
        },
        example: ['2026-04-04', '2026-04-11', '2026-04-18', '2026-04-25'],
        description:
          'Exact occurrence dates for MONTHLY and YEARLY todos, inside the current schedule window.',
      },
      deductAmount: {
        type: 'number',
        example: 1000,
        description:
          'Recurring-expense deduction amount applied against remainingAmount.',
      },
      recordedOccurrenceDate: {
        type: 'string',
        format: 'date',
        example: '2026-04-04',
        description:
          'The exact recurring occurrence date being recorded to expenses.',
      },
      primaryImageId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
      },
      images: {
        type: 'array',
        items: {
          type: 'string',
          format: 'binary',
        },
        maxItems: 6,
      },
    },
  };
}

export function ApiListCurrentUserTodosEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user todo items',
      description:
        'Returns paginated non-deleted todo items owned by the authenticated user. Each todo response includes its active images, the primary cover image URL, and the stored priority level. Text search matches the todo name when at least 3 characters are provided. dateFrom/dateTo filters are applied against the todo schedule occurrence dates, not createdAt.',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      type: String,
      example: 'TOP_PRIORITY',
      description: 'Optional todo priority filter.',
    }),
    ApiQuery({
      name: 'done',
      required: false,
      type: Boolean,
      example: false,
      description: 'Optional done-state filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'insurance',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the todo name.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-04-01',
      description:
        'Optional inclusive start date filter applied against scheduled occurrence dates, not createdAt.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-30',
      description:
        'Optional inclusive end date filter applied against scheduled occurrence dates, not createdAt.',
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
      description: 'Todo items retrieved successfully.',
      type: PaginatedTodoResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access todo items.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiGetCurrentUserTodoEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Get one todo item',
      description:
        'Returns one non-deleted todo item owned by the authenticated user together with all active Cloudinary-backed images and its current primary cover image.',
    }),
    ApiParam({
      name: 'todoId',
      description: 'UUID of the todo item to retrieve.',
      format: 'uuid',
    }),
    ApiOkResponse({
      description: 'Todo item retrieved successfully.',
      type: TodoResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to access todo items.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested todo item does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiCreateCurrentUserTodoEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Create a todo item',
      description:
        'Creates a new todo item for the authenticated user. Images are optional. The request can also define a recurring schedule with an auto-derived end date, weekday selection for weekly todos, or exact occurrence dates for monthly and yearly todos. When images are included, each upload is cropped to a square 1600×1600 asset, renamed using the todo name plus an upload timestamp and unique numeric suffix, then stored in Cloudinary under the configured todo folder.',
    }),
    ApiBody({
      schema: createTodoMultipartSchema(false),
    }),
    ApiCreatedResponse({
      description: 'Todo item created successfully.',
      type: TodoResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed or one of the uploaded files is invalid.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to create todo items.',
      type: ApiErrorResponseDto,
    }),
    ApiServiceUnavailableResponse({
      description:
        'Todo image storage is not configured with Cloudinary credentials.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many todo write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiUpdateCurrentUserTodoEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update a todo item and optionally append images',
      description:
        'Updates one existing todo item owned by the authenticated user. Name, price, priority, schedule, and done state can be changed. New images may be appended in the same request, an existing active image can be promoted to become the primary cover image, and recurring todos can record expense deductions against their remaining budget.',
    }),
    ApiParam({
      name: 'todoId',
      description: 'UUID of the todo item to update.',
      format: 'uuid',
    }),
    ApiBody({
      schema: createTodoMultipartSchema(false),
    }),
    ApiOkResponse({
      description: 'Todo item updated successfully.',
      type: TodoResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, too many images were supplied, or no updatable fields were provided.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update todo items.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested todo item or primary image does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiServiceUnavailableResponse({
      description:
        'Todo image storage is not configured with Cloudinary credentials.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many todo write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCurrentUserTodoEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete a todo item',
      description:
        'Soft-deletes one todo item owned by the authenticated user together with its active image rows so it no longer appears in standard todo listings.',
    }),
    ApiParam({
      name: 'todoId',
      description: 'UUID of the todo item to delete.',
      format: 'uuid',
    }),
    ApiNoContentResponse({
      description: 'Todo item deleted successfully.',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to delete todo items.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested todo item does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many todo write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiDeleteCurrentUserTodoImageEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete one todo image',
      description:
        'Soft-deletes one active image from a todo item owned by the authenticated user. If the removed image is currently the primary cover image, the service automatically promotes the oldest remaining active image to primary when one still exists.',
    }),
    ApiParam({
      name: 'todoId',
      description: 'UUID of the parent todo item.',
      format: 'uuid',
    }),
    ApiParam({
      name: 'imageId',
      description: 'UUID of the todo image to delete.',
      format: 'uuid',
    }),
    ApiOkResponse({
      description: 'Todo image deleted successfully and todo state refreshed.',
      type: TodoResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to update todo items.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description:
        'The requested todo item or todo image does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many todo write requests were sent in a short time. Wait about 15 seconds before trying again.',
      type: ApiErrorResponseDto,
    }),
  );
}
