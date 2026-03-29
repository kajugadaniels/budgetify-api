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
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TodoPriority } from '@prisma/client';

import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
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
        'Returns all non-deleted todo items owned by the authenticated user. Each todo response includes its active images, the primary cover image URL, and the stored priority level.',
    }),
    ApiOkResponse({
      description: 'Todo items retrieved successfully.',
      type: TodoResponseDto,
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
      summary: 'Create a todo item with images',
      description:
        'Creates a new todo item for the authenticated user. At least one image is required. Every uploaded image is cropped to a square 1600×1600 asset, renamed using the todo name plus an upload timestamp and unique numeric suffix, then stored in Cloudinary under the configured todo folder.',
    }),
    ApiBody({
      schema: createTodoMultipartSchema(true),
    }),
    ApiCreatedResponse({
      description: 'Todo item created successfully.',
      type: TodoResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, no images were provided, or one of the uploaded files is invalid.',
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
  );
}

export function ApiUpdateCurrentUserTodoEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update a todo item and optionally append images',
      description:
        'Updates one existing todo item owned by the authenticated user. Name, price, and priority can be changed. New images may be appended in the same request, and an existing active image can be promoted to become the primary cover image.',
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
  );
}

export function ApiDeleteCurrentUserTodoImageEndpoint(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Delete one todo image',
      description:
        'Soft-deletes one active image from a todo item owned by the authenticated user. If the removed image is currently the primary cover image, the service automatically promotes the oldest remaining active image to primary. The final remaining image cannot be removed while the todo still exists.',
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
    ApiBadRequestResponse({
      description:
        'The image cannot be removed because it is the final active image for the todo item.',
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
        'The requested todo item or todo image does not exist for the authenticated user.',
      type: ApiErrorResponseDto,
    }),
  );
}
