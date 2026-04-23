import { TodoImage, TodoOccurrenceStatus } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedTodoResponseDto } from '../dto/paginated-todo.response.dto';
import { TodoAuditResponseDto } from '../dto/todo-audit.response.dto';
import { TodoImageResponseDto } from '../dto/todo-image-response.dto';
import { TodoOccurrenceResponseDto } from '../dto/todo-occurrence.response.dto';
import { TodoRecordingResponseDto } from '../dto/todo-recording.response.dto';
import { TodoResponseDto } from '../dto/todo-response.dto';
import { TodoSummaryResponseDto } from '../dto/todo-summary.response.dto';
import { TodoUpcomingResponseDto } from '../dto/todo-upcoming.response.dto';
import {
  TodoRecordingWithRelations,
  TodoOccurrenceWithRecording,
  TodoWithImages,
} from '../todos.repository';
import {
  TodoAuditSnapshot,
  TodoSummarySnapshot,
  TodoUpcomingSnapshot,
} from '../todos.service';

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
      occurrenceDates: todo.occurrences.map((occurrence) =>
        occurrence.occurrenceDate.toISOString().slice(0, 10),
      ),
      recordedOccurrenceDates: todo.occurrences
        .filter(
          (occurrence) =>
            TodosMapper.resolveOccurrenceStatus(
              occurrence.occurrenceDate,
              occurrence.status,
            ) === TodoOccurrenceStatus.RECORDED,
        )
        .map((occurrence) =>
          occurrence.occurrenceDate.toISOString().slice(0, 10),
        ),
      occurrences: todo.occurrences.map((occurrence) =>
        TodosMapper.toTodoOccurrenceResponse(occurrence),
      ),
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
      todo: {
        id: recording.todo.id,
        name: recording.todo.name,
        frequency: recording.todo.frequency,
        status: recording.todo.status,
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

  static toTodoOccurrenceResponse(
    occurrence: TodoOccurrenceWithRecording,
  ): TodoOccurrenceResponseDto {
    return {
      id: occurrence.id,
      occurrenceDate: occurrence.occurrenceDate.toISOString().slice(0, 10),
      status: TodosMapper.resolveOccurrenceStatus(
        occurrence.occurrenceDate,
        occurrence.status,
      ),
      recordingId: occurrence.recording?.id ?? null,
      expenseId: occurrence.recording?.expenseId ?? null,
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
      totalRemainingAmount: summary.totalRemainingAmount,
      recordedCount: summary.recordedCount,
      recordedBaseTotalAmount: summary.recordedBaseTotalAmount,
      recordedFeeTotalAmount: summary.recordedFeeTotalAmount,
      recordedTotalAmount: summary.recordedTotalAmount,
      recordedVarianceTotalAmount: summary.recordedVarianceTotalAmount,
      feeBearingRecordingCount: summary.feeBearingRecordingCount,
      overdueCount: summary.overdueCount,
      overdueOccurrenceCount: summary.overdueOccurrenceCount,
      dueNext7DaysCount: summary.dueNext7DaysCount,
      next7DaysScheduledAmount: summary.dueNext7DaysAmount,
      dueNext30DaysCount: summary.dueNext30DaysCount,
      next30DaysScheduledAmount: summary.dueNext30DaysAmount,
      recurringBudgetBurnDown: summary.recurringBudgetBurnDown,
      completionByFrequency: summary.completionByFrequency,
      latestTodo: summary.latestTodo,
    };
  }

  static toTodoAuditResponse(audit: TodoAuditSnapshot): TodoAuditResponseDto {
    return {
      periodStartDate: audit.periodStartDate,
      periodEndDate: audit.periodEndDate,
      todoCount: audit.todoCount,
      openTodoCount: audit.openTodoCount,
      recurringTodoCount: audit.recurringTodoCount,
      totalPlannedAmount: audit.totalPlannedAmount,
      totalRemainingAmount: audit.totalRemainingAmount,
      recordingCount: audit.recordingCount,
      totalRecordedBaseAmount: audit.totalRecordedBaseAmount,
      totalRecordedFeeAmount: audit.totalRecordedFeeAmount,
      totalRecordedChargedAmount: audit.totalRecordedChargedAmount,
      totalRecordedVarianceAmount: audit.totalRecordedVarianceAmount,
      feeBearingRecordingCount: audit.feeBearingRecordingCount,
      overdueTodoCount: audit.overdueTodoCount,
      overdueOccurrenceCount: audit.overdueOccurrenceCount,
      dueThisWeekCount: audit.dueThisWeekCount,
      dueThisWeekAmount: audit.dueThisWeekAmount,
      dueThisMonthCount: audit.dueThisMonthCount,
      dueThisMonthAmount: audit.dueThisMonthAmount,
      completionPercentage: audit.completionPercentage,
      recurringBudgetBurnDown: audit.recurringBudgetBurnDown,
      completionByFrequency: audit.completionByFrequency,
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

  private static resolveOccurrenceStatus(
    occurrenceDate: Date,
    status: TodoOccurrenceStatus,
  ): TodoOccurrenceStatus {
    if (status !== TodoOccurrenceStatus.SCHEDULED) {
      return status;
    }

    const today = new Date();
    const todayStart = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );

    return occurrenceDate.getTime() < todayStart.getTime()
      ? TodoOccurrenceStatus.OVERDUE
      : TodoOccurrenceStatus.SCHEDULED;
  }
}
