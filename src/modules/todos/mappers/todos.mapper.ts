import { TodoImage } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedTodoResponseDto } from '../dto/paginated-todo.response.dto';
import { TodoImageResponseDto } from '../dto/todo-image-response.dto';
import { TodoRecordingResponseDto } from '../dto/todo-recording.response.dto';
import { TodoResponseDto } from '../dto/todo-response.dto';
import { TodoSummaryResponseDto } from '../dto/todo-summary.response.dto';
import { TodoUpcomingResponseDto } from '../dto/todo-upcoming.response.dto';
import {
  TodoRecordingWithRelations,
  TodoWithImages,
} from '../todos.repository';
import { TodoSummarySnapshot, TodoUpcomingSnapshot } from '../todos.service';

export class TodosMapper {
  static toTodoResponse(todo: TodoWithImages): TodoResponseDto {
    const coverImage =
      todo.images.find((image) => image.isPrimary) ?? todo.images[0];

    return {
      id: todo.id,
      name: todo.name,
      price: Number(todo.price),
      priority: todo.priority,
      status: todo.status,
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
      plannedAmount: Number(recording.plannedAmount),
      baseAmount: Number(recording.baseAmount),
      feeAmount: Number(recording.feeAmount),
      totalChargedAmount: Number(recording.totalChargedAmount),
      varianceAmount: Number(recording.varianceAmount),
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
      expense: recording.expense
        ? {
            id: recording.expense.id,
            label: recording.expense.label,
            category: recording.expense.category,
            date: recording.expense.date,
            totalAmountRwf: Number(recording.expense.totalAmountRwf),
            feeAmountRwf: Number(recording.expense.feeAmountRwf),
          }
        : null,
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

  static toTodoSummaryResponse(
    summary: TodoSummarySnapshot,
  ): TodoSummaryResponseDto {
    return {
      totalCount: summary.totalCount,
      openCount: summary.openCount,
      completedCount: summary.completedCount,
      recurringCount: summary.recurringCount,
      topPriorityCount: summary.topPriorityCount,
      withImagesCount: summary.withImagesCount,
      completionPercentage: summary.completionPercentage,
      imageCoveragePercentage: summary.imageCoveragePercentage,
      plannedTotal: summary.plannedTotal,
      openPlannedTotal: summary.openPlannedTotal,
      remainingRecurringBudgetTotal: summary.remainingRecurringBudgetTotal,
      recordedCount: summary.recordedCount,
      recordedTotalAmount: summary.recordedTotalAmount,
      overdueCount: summary.overdueCount,
      next7DaysScheduledAmount: summary.next7DaysScheduledAmount,
      next30DaysScheduledAmount: summary.next30DaysScheduledAmount,
      latestTodo: summary.latestTodo,
    };
  }

  static toTodoUpcomingResponse(
    upcoming: TodoUpcomingSnapshot,
  ): TodoUpcomingResponseDto {
    return {
      windowDays: upcoming.windowDays,
      daysWithPlans: upcoming.daysWithPlans,
      occurrenceCount: upcoming.occurrenceCount,
      totalScheduledAmount: upcoming.totalScheduledAmount,
      overdueCount: upcoming.overdueCount,
      reserveSummary: {
        targetAmount: upcoming.reserveSummary.targetAmount,
        usedAmount: upcoming.reserveSummary.usedAmount,
        remainingAmount: upcoming.reserveSummary.remainingAmount,
        items: upcoming.reserveSummary.items.map((item) => ({
          id: item.id,
          name: item.name,
          frequency: item.frequency,
          targetAmount: item.targetAmount,
          usedAmount: item.usedAmount,
          remainingAmount: item.remainingAmount,
          remainingOccurrenceCount: item.remainingOccurrenceCount,
        })),
      },
      days: upcoming.days.map((day) => ({
        date: day.date,
        itemCount: day.itemCount,
        totalAmount: day.totalAmount,
        items: day.items.map((item) => ({
          id: item.id,
          name: item.name,
          frequency: item.frequency,
          amount: item.amount,
        })),
      })),
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
