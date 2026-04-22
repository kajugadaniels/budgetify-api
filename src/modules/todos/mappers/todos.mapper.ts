import { TodoImage } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedTodoResponseDto } from '../dto/paginated-todo.response.dto';
import { TodoImageResponseDto } from '../dto/todo-image-response.dto';
import { TodoRecordingResponseDto } from '../dto/todo-recording.response.dto';
import { TodoResponseDto } from '../dto/todo-response.dto';
import {
  TodoRecordingWithRelations,
  TodoWithImages,
} from '../todos.repository';

export class TodosMapper {
  static toTodoResponse(todo: TodoWithImages): TodoResponseDto {
    const coverImage =
      todo.images.find((image) => image.isPrimary) ?? todo.images[0];

    return {
      id: todo.id,
      name: todo.name,
      price: Number(todo.price),
      priority: todo.priority,
      done: todo.done,
      frequency: todo.frequency,
      startDate: todo.startDate
        ? todo.startDate.toISOString().slice(0, 10)
        : null,
      endDate: todo.endDate ? todo.endDate.toISOString().slice(0, 10) : null,
      frequencyDays: todo.frequencyDays,
      occurrenceDates: todo.occurrenceDates,
      recordedOccurrenceDates: todo.recordedOccurrenceDates,
      remainingAmount:
        todo.remainingAmount !== null ? Number(todo.remainingAmount) : null,
      recordingCount: todo._count.recordings,
      recordings: todo.recordings.map((recording) =>
        TodosMapper.toTodoRecordingResponse(recording),
      ),
      coverImageUrl: coverImage?.imageUrl ?? null,
      imageCount: todo.images.length,
      images: todo.images.map((image) =>
        TodosMapper.toTodoImageResponse(image),
      ),
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      createdBy: {
        id: todo.user.id,
        firstName: todo.user.firstName,
        lastName: todo.user.lastName,
        avatarUrl: todo.user.avatarUrl,
      },
    };
  }

  static toTodoRecordingResponse(
    recording: TodoRecordingWithRelations,
  ): TodoRecordingResponseDto {
    return {
      id: recording.id,
      todoId: recording.todoId,
      expenseId: recording.expenseId,
      occurrenceDate: recording.occurrenceDate.toISOString().slice(0, 10),
      baseAmount: Number(recording.baseAmount),
      feeAmount: Number(recording.feeAmount),
      totalChargedAmount: Number(recording.totalChargedAmount),
      paymentMethod: recording.paymentMethod,
      mobileMoneyChannel: recording.mobileMoneyChannel,
      mobileMoneyNetwork: recording.mobileMoneyNetwork,
      recordedAt: recording.recordedAt,
      recordedBy: {
        id: recording.recordedBy.id,
        firstName: recording.recordedBy.firstName,
        lastName: recording.recordedBy.lastName,
        avatarUrl: recording.recordedBy.avatarUrl,
      },
    };
  }

  static toTodoResponseList(todos: TodoWithImages[]): TodoResponseDto[] {
    return todos.map((todo) => TodosMapper.toTodoResponse(todo));
  }

  static toPaginatedTodoResponse(
    payload: PaginatedResponse<TodoWithImages>,
  ): PaginatedTodoResponseDto {
    return {
      items: TodosMapper.toTodoResponseList(payload.items),
      meta: payload.meta,
    };
  }

  private static toTodoImageResponse(image: TodoImage): TodoImageResponseDto {
    return {
      id: image.id,
      imageUrl: image.imageUrl,
      publicId: image.publicId,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      format: image.format,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }
}
