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
import {
  TodoFrequency,
  TodoPriority,
  TodoStatus,
  TodoType,
} from '@prisma/client';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { CreateTodoExpenseRequestDto } from './dto/create-todo-expense.request.dto';
import { PaginatedTodoResponseDto } from './dto/paginated-todo.response.dto';
import { TodoAuditResponseDto } from './dto/todo-audit.response.dto';
import { TodoRecordingResponseDto } from './dto/todo-recording.response.dto';
import { TodoResponseDto } from './dto/todo-response.dto';
import { TodoSummaryResponseDto } from './dto/todo-summary.response.dto';
import { TodoUpcomingResponseDto } from './dto/todo-upcoming.response.dto';

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
      type: {
        type: 'string',
        enum: Object.values(TodoType),
        example: TodoType.WISHLIST,
        default: TodoType.WISHLIST,
        description:
          'Planning intent. WISHLIST is aspirational, PLANNED_SPEND is a one-off operational spend, and RECURRING_OBLIGATION is a repeating commitment.',
      },
      status: {
        type: 'string',
        enum: Object.values(TodoStatus),
        example: TodoStatus.ACTIVE,
        default: TodoStatus.ACTIVE,
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
        'Returns paginated non-deleted todo items owned by the authenticated user. Each todo response includes its active images, the primary cover image URL, and the stored lifecycle status. Text search matches the todo name when at least 3 characters are provided. Frequency filtering supports ONCE, WEEKLY, MONTHLY, and YEARLY. dateFrom/dateTo filters are applied against the todo schedule occurrence dates, not createdAt.',
    }),
    ApiQuery({
      name: 'frequency',
      required: false,
      enum: TodoFrequency,
      example: TodoFrequency.ONCE,
      description:
        'Optional todo frequency filter. Use ONCE for one-time todos.',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      type: String,
      example: 'TOP_PRIORITY',
      description: 'Optional todo priority filter.',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: TodoType,
      example: TodoType.WISHLIST,
      description: 'Optional planning intent filter.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: TodoStatus,
      example: TodoStatus.ACTIVE,
      description: 'Optional lifecycle status filter.',
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

export function ApiSummarizeCurrentUserTodosEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Summarize current user todo items',
      description:
        'Returns high-level todo planning metrics for the authenticated user across the currently visible todo set. The summary respects the same frequency, priority, status, search, and occurrence date filters as the main todo listing, but does not paginate.',
    }),
    ApiQuery({
      name: 'frequency',
      required: false,
      enum: TodoFrequency,
      example: TodoFrequency.ONCE,
      description: 'Optional todo frequency filter.',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      type: String,
      example: 'TOP_PRIORITY',
      description: 'Optional todo priority filter.',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: TodoType,
      example: TodoType.PLANNED_SPEND,
      description: 'Optional planning intent filter.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: TodoStatus,
      example: TodoStatus.ACTIVE,
      description: 'Optional lifecycle status filter.',
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
        'Optional inclusive start date filter applied against scheduled occurrence dates.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-30',
      description:
        'Optional inclusive end date filter applied against scheduled occurrence dates.',
    }),
    ApiOkResponse({
      description: 'Todo summary retrieved successfully.',
      type: TodoSummaryResponseDto,
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

export function ApiAuditCurrentUserTodosEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Audit current user todo planning',
      description:
        'Returns audit-grade todo planning totals for the authenticated user, including planned-versus-recorded amounts, fee-bearing recordings, overdue occurrences, due-this-week and due-this-month exposure, recurring budget burn-down, and completion rates by frequency. The audit respects the same frequency, priority, status, search, and occurrence date filters as the main todo listing.',
    }),
    ApiQuery({
      name: 'frequency',
      required: false,
      enum: TodoFrequency,
      example: TodoFrequency.MONTHLY,
      description: 'Optional todo frequency filter.',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      type: String,
      example: 'TOP_PRIORITY',
      description: 'Optional todo priority filter.',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: TodoType,
      example: TodoType.RECURRING_OBLIGATION,
      description: 'Optional planning intent filter.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: TodoStatus,
      example: TodoStatus.ACTIVE,
      description: 'Optional lifecycle status filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'fees',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the todo name.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-04-01',
      description:
        'Optional inclusive start date filter applied against scheduled occurrence dates.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-30',
      description:
        'Optional inclusive end date filter applied against scheduled occurrence dates.',
    }),
    ApiOkResponse({
      description: 'Todo audit metrics retrieved successfully.',
      type: TodoAuditResponseDto,
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

export function ApiListCurrentUserTodoUpcomingEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Plan upcoming todo commitments',
      description:
        'Returns the next upcoming todo occurrence buckets together with recurring reserve guidance for the authenticated user. The planning view respects the same todo filters as the list endpoint and groups still-open occurrence dates starting from today.',
    }),
    ApiQuery({
      name: 'frequency',
      required: false,
      enum: TodoFrequency,
      example: TodoFrequency.MONTHLY,
      description: 'Optional todo frequency filter.',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      type: String,
      example: 'TOP_PRIORITY',
      description: 'Optional todo priority filter.',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: TodoType,
      example: TodoType.RECURRING_OBLIGATION,
      description: 'Optional planning intent filter.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: TodoStatus,
      example: TodoStatus.ACTIVE,
      description: 'Optional lifecycle status filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'fees',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the todo name.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-04-01',
      description:
        'Optional inclusive start date filter applied against scheduled occurrence dates.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-30',
      description:
        'Optional inclusive end date filter applied against scheduled occurrence dates.',
    }),
    ApiQuery({
      name: 'days',
      required: false,
      type: Number,
      example: 7,
      description:
        'How many upcoming calendar days to include starting from today. Defaults to 7.',
    }),
    ApiOkResponse({
      description: 'Upcoming todo planning data retrieved successfully.',
      type: TodoUpcomingResponseDto,
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

export function ApiListCurrentUserTodoRecordingsEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'List current user todo recordings',
      description:
        'Returns the todo recording ledger across the currently visible todo set. The recording index respects the same frequency, priority, status, search, and occurrence date filters as the main todo listing and is sorted by most recently recorded first.',
    }),
    ApiQuery({
      name: 'frequency',
      required: false,
      enum: TodoFrequency,
      example: TodoFrequency.MONTHLY,
      description: 'Optional todo frequency filter.',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      type: String,
      example: 'TOP_PRIORITY',
      description: 'Optional todo priority filter.',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: TodoType,
      example: TodoType.WISHLIST,
      description: 'Optional planning intent filter.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: TodoStatus,
      example: TodoStatus.RECORDED,
      description: 'Optional lifecycle status filter.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'transport',
      description:
        'Optional text search applied when at least 3 characters are provided. Matches the todo name.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      type: String,
      example: '2026-04-01',
      description:
        'Optional inclusive start occurrence date filter applied against recording occurrence dates.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      type: String,
      example: '2026-04-30',
      description:
        'Optional inclusive end occurrence date filter applied against recording occurrence dates.',
    }),
    ApiOkResponse({
      description: 'Todo recordings retrieved successfully.',
      type: TodoRecordingResponseDto,
      isArray: true,
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

export function ApiCreateCurrentUserTodoExpenseEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Record a todo directly as an expense',
      description:
        'Creates the expense and its todo recording in one database transaction. Mobile money charges are calculated from the configured tariff table, the recorded occurrence is validated against the todo schedule, recurring remaining budget is deducted by the charged total, and the recording stores planned-versus-actual variance for later audit reporting.',
    }),
    ApiParam({
      name: 'todoId',
      description: 'UUID of the todo item being recorded as an expense.',
      format: 'uuid',
    }),
    ApiBody({ type: CreateTodoExpenseRequestDto }),
    ApiCreatedResponse({
      description: 'Todo expense recorded successfully.',
      type: TodoRecordingResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, the occurrence was already recorded, or the charged amount exceeds the recurring todo budget.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description:
        'Authenticated user account is not allowed to record todo expenses.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'The requested todo item does not exist.',
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
        'Updates one existing todo item owned by the authenticated user. Name, price, priority, status, and schedule can be changed. New images may be appended in the same request, an existing active image can be promoted to become the primary cover image, and recurring todos can record expense deductions against their remaining budget.',
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
