import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TodoFrequency } from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import {
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { UsersService } from '../users/users.service';
import { CreateTodoRequestDto } from './dto/create-todo.request.dto';
import { CreateTodoRecordingRequestDto } from './dto/create-todo-recording.request.dto';
import { ListTodosQueryDto } from './dto/list-todos.query.dto';
import { UpdateTodoRequestDto } from './dto/update-todo.request.dto';
import {
  MAX_TODO_IMAGES,
  StoredTodoImage,
  TodoImageStorageService,
  TodoUploadFile,
} from './services/todo-image-storage.service';
import {
  TodoRecordingWithRelations,
  TodoWithImages,
  TodosRepository,
} from './todos.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

type ResolvedRecurringSchedule = {
  endDate: Date;
  frequency: TodoFrequency;
  frequencyDays: number[];
  occurrenceDates: string[];
  startDate: Date;
};

@Injectable()
export class TodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todosRepository: TodosRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly todoImageStorageService: TodoImageStorageService,
  ) {}

  async listCurrentUserTodos(
    userId: string,
    query: ListTodosQueryDto,
  ): Promise<PaginatedResponse<TodoWithImages>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);

    return this.todosRepository.findManyByUserIds(visibleUserIds, {
      frequency: query.frequency,
      priority: query.priority,
      done: query.done,
      search: normalizeListSearch(query.search),
      occurrenceDates: dateRange?.isoDates,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  async getCurrentUserTodo(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.findVisibleTodoOrThrow(userId, todoId);
  }

  async createCurrentUserTodo(
    userId: string,
    payload: CreateTodoRequestDto,
    files: TodoUploadFile[],
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    if (files.length > 0) {
      this.todoImageStorageService.ensureConfigured();
    }

    const schedule = this.resolveSchedule({
      frequency: payload.frequency ?? TodoFrequency.ONCE,
      startDateInput: payload.startDate,
      frequencyDays: payload.frequencyDays,
      occurrenceDates: payload.occurrenceDates,
    });

    const price = new Prisma.Decimal(payload.price);
    const remainingAmount =
      schedule.frequency === TodoFrequency.ONCE ? null : price;

    const todo = await this.todosRepository.create({
      userId,
      name: payload.name,
      price,
      priority: payload.priority,
      done: payload.done,
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      frequencyDays: schedule.frequencyDays,
      occurrenceDates: schedule.occurrenceDates,
      recordedOccurrenceDates: [],
      remainingAmount,
    });

    const uploadedImages = await this.uploadTodoImages(
      todo.id,
      payload.name,
      files,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.todosRepository.createTodoImages(
          uploadedImages.map((image, index) =>
            this.buildTodoImageCreateInput(todo.id, image, index === 0),
          ),
          tx,
        );
      });
    } catch (error) {
      await Promise.all([
        this.todoImageStorageService.cleanupUploadedImages(
          uploadedImages.map((image) => image.publicId),
        ),
        this.todosRepository.update(todo.id, { deletedAt: new Date() }),
      ]);

      throw error;
    }

    return this.findOwnedTodoOrThrow(userId, todo.id);
  }

  async listCurrentUserTodoRecordings(
    userId: string,
    todoId: string,
  ): Promise<TodoRecordingWithRelations[]> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const todo = await this.findVisibleTodoOrThrow(userId, todoId);
    return this.todosRepository.findRecordingsByTodoId(todo.id);
  }

  async recordCurrentUserTodoExpense(
    userId: string,
    todoId: string,
    payload: CreateTodoRecordingRequestDto,
  ): Promise<TodoRecordingWithRelations> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const [todo, expense, existingRecording] = await Promise.all([
      this.findVisibleTodoOrThrow(userId, todoId),
      this.expensesRepository.findActiveByIdAndUserIds(
        payload.expenseId,
        visibleUserIds,
      ),
      this.todosRepository.findRecordingByExpenseId(payload.expenseId),
    ]);

    if (!expense) {
      throw new NotFoundException('Linked expense was not found.');
    }

    if (existingRecording) {
      throw new BadRequestException(
        'This expense has already been linked to a todo recording.',
      );
    }

    const occurrenceDate = this.parseDateOnly(
      payload.occurrenceDate.slice(0, 10),
    );
    const occurrenceIsoDate = this.toIsoDate(occurrenceDate);
    const expenseIsoDate = expense.date.toISOString().slice(0, 10);

    if (expenseIsoDate !== occurrenceIsoDate) {
      throw new BadRequestException(
        'The occurrence date must match the linked expense date.',
      );
    }

    const chargedAmount = new Prisma.Decimal(expense.totalAmountRwf);

    if (todo.frequency === TodoFrequency.ONCE && todo._count.recordings > 0) {
      throw new BadRequestException(
        'This one-time todo already has a recorded expense.',
      );
    }

    let nextRecordedOccurrenceDates = [...todo.recordedOccurrenceDates];
    let nextRemainingAmount = todo.remainingAmount;
    let nextDone = true;

    if (todo.frequency !== TodoFrequency.ONCE) {
      if (nextRemainingAmount === null) {
        throw new BadRequestException(
          'Recurring todos must keep a remaining amount.',
        );
      }

      this.assertOccurrenceDateAvailable(
        occurrenceIsoDate,
        todo.occurrenceDates,
        nextRecordedOccurrenceDates,
      );

      if (chargedAmount.greaterThan(nextRemainingAmount)) {
        throw new BadRequestException(
          'Total charged amount cannot exceed the remaining recurring budget.',
        );
      }

      nextRecordedOccurrenceDates = this.sortIsoDates([
        ...nextRecordedOccurrenceDates,
        occurrenceIsoDate,
      ]);
      nextRemainingAmount = this.clampDecimalToZero(
        nextRemainingAmount.minus(chargedAmount),
      );

      const remainingOccurrencesCount = todo.occurrenceDates.filter(
        (date) => !nextRecordedOccurrenceDates.includes(date),
      ).length;
      nextDone =
        nextRemainingAmount.lessThanOrEqualTo(0) ||
        remainingOccurrencesCount === 0;
    }

    return this.prisma.$transaction(async (tx) => {
      await this.todosRepository.update(
        todo.id,
        {
          done: nextDone,
          recordedOccurrenceDates:
            todo.frequency === TodoFrequency.ONCE
              ? undefined
              : { set: nextRecordedOccurrenceDates },
          remainingAmount:
            todo.frequency === TodoFrequency.ONCE
              ? undefined
              : nextRemainingAmount,
        },
        tx,
      );

      return this.todosRepository.createRecording(
        {
          todoId: todo.id,
          expenseId: expense.id,
          occurrenceDate,
          baseAmount: expense.amountRwf,
          feeAmount: expense.feeAmountRwf,
          totalChargedAmount: expense.totalAmountRwf,
          paymentMethod: expense.paymentMethod,
          mobileMoneyChannel: expense.mobileMoneyChannel,
          mobileMoneyNetwork: expense.mobileMoneyNetwork,
          recordedAt: new Date(),
          recordedByUserId: userId,
        },
        tx,
      );
    });
  }

  async updateCurrentUserTodo(
    userId: string,
    todoId: string,
    payload: UpdateTodoRequestDto,
    files: TodoUploadFile[],
  ): Promise<TodoWithImages> {
    if (
      payload.name === undefined &&
      payload.price === undefined &&
      payload.priority === undefined &&
      payload.done === undefined &&
      payload.frequency === undefined &&
      payload.startDate === undefined &&
      payload.endDate === undefined &&
      payload.frequencyDays === undefined &&
      payload.occurrenceDates === undefined &&
      payload.primaryImageId === undefined &&
      payload.deductAmount === undefined &&
      payload.recordedOccurrenceDate === undefined &&
      files.length === 0
    ) {
      throw new BadRequestException(
        'Provide at least one todo field or image to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findVisibleTodoOrThrow(userId, todoId);

    const nextName = payload.name ?? todo.name;
    const uploadedImages =
      files.length === 0
        ? []
        : await this.uploadTodoImages(todo.id, nextName, files);

    if (payload.primaryImageId !== undefined) {
      const primaryImage =
        await this.todosRepository.findActiveImageByIdAndTodoId(
          payload.primaryImageId,
          todo.id,
        );

      if (!primaryImage) {
        await this.todoImageStorageService.cleanupUploadedImages(
          uploadedImages.map((image) => image.publicId),
        );

        throw new NotFoundException(
          'The selected primary todo image was not found.',
        );
      }
    }

    const currentFrequency = todo.frequency;
    const nextFrequency = payload.frequency ?? currentFrequency;
    const scheduleHasChanged =
      payload.frequency !== undefined ||
      payload.startDate !== undefined ||
      payload.frequencyDays !== undefined ||
      payload.occurrenceDates !== undefined;

    const currentStartDate =
      todo.startDate !== null
        ? this.toIsoDate(todo.startDate)
        : this.getTodayDateString();

    const nextSchedule = scheduleHasChanged
      ? this.resolveSchedule({
          frequency: nextFrequency,
          startDateInput: payload.startDate ?? currentStartDate,
          frequencyDays: payload.frequencyDays ?? todo.frequencyDays,
          occurrenceDates: payload.occurrenceDates ?? todo.occurrenceDates,
        })
      : {
          frequency: nextFrequency,
          startDate: todo.startDate ?? this.parseDateOnly(currentStartDate),
          endDate:
            todo.endDate ??
            this.computeEndDate(
              this.parseDateOnly(currentStartDate),
              nextFrequency,
            ),
          frequencyDays: todo.frequencyDays,
          occurrenceDates: todo.occurrenceDates,
        };

    const nextPrice =
      payload.price !== undefined
        ? new Prisma.Decimal(payload.price)
        : todo.price;
    const spentSoFar = this.resolveSpentAmount(todo);
    let nextRecordedOccurrenceDates =
      scheduleHasChanged && nextSchedule.frequency !== TodoFrequency.ONCE
        ? this.filterRecordedOccurrenceDates(
            todo.recordedOccurrenceDates,
            nextSchedule.occurrenceDates,
          )
        : [...todo.recordedOccurrenceDates];

    let nextRemainingAmount =
      nextSchedule.frequency === TodoFrequency.ONCE
        ? null
        : this.clampDecimalToZero(nextPrice.minus(spentSoFar));

    if (
      payload.deductAmount !== undefined ||
      payload.recordedOccurrenceDate !== undefined
    ) {
      if (nextSchedule.frequency === TodoFrequency.ONCE) {
        throw new BadRequestException(
          'Only recurring todos support expense deductions.',
        );
      }

      if (
        payload.deductAmount === undefined ||
        payload.recordedOccurrenceDate === undefined
      ) {
        throw new BadRequestException(
          'deductAmount and recordedOccurrenceDate must be provided together.',
        );
      }

      if (nextRemainingAmount === null) {
        throw new BadRequestException(
          'Recurring todos must keep a remaining amount.',
        );
      }

      const deduction = new Prisma.Decimal(payload.deductAmount);

      if (deduction.greaterThan(nextRemainingAmount)) {
        throw new BadRequestException(
          'deductAmount cannot exceed the remaining recurring budget.',
        );
      }

      this.assertOccurrenceDateAvailable(
        payload.recordedOccurrenceDate,
        nextSchedule.occurrenceDates,
        nextRecordedOccurrenceDates,
      );

      nextRecordedOccurrenceDates = this.sortIsoDates([
        ...nextRecordedOccurrenceDates,
        payload.recordedOccurrenceDate,
      ]);
      nextRemainingAmount = this.clampDecimalToZero(
        nextRemainingAmount.minus(deduction),
      );
    }

    const remainingOccurrencesCount =
      nextSchedule.frequency === TodoFrequency.ONCE
        ? 0
        : nextSchedule.occurrenceDates.filter(
            (date) => !nextRecordedOccurrenceDates.includes(date),
          ).length;
    const autoDone =
      nextSchedule.frequency !== TodoFrequency.ONCE &&
      (nextRemainingAmount?.lessThanOrEqualTo(0) === true ||
        remainingOccurrencesCount === 0);
    const nextDone = autoDone ? true : (payload.done ?? todo.done);

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.todosRepository.update(
          todo.id,
          {
            name: payload.name,
            price:
              payload.price === undefined
                ? undefined
                : new Prisma.Decimal(payload.price),
            priority: payload.priority,
            done: nextDone,
            frequency: nextSchedule.frequency,
            startDate: nextSchedule.startDate,
            endDate: nextSchedule.endDate,
            frequencyDays: { set: nextSchedule.frequencyDays },
            occurrenceDates: { set: nextSchedule.occurrenceDates },
            recordedOccurrenceDates: {
              set:
                nextSchedule.frequency === TodoFrequency.ONCE
                  ? []
                  : nextRecordedOccurrenceDates,
            },
            remainingAmount: nextRemainingAmount,
          },
          tx,
        );

        if (uploadedImages.length > 0) {
          const shouldAssignFirstUploadAsPrimary = todo.images.length === 0;

          await this.todosRepository.createTodoImages(
            uploadedImages.map((image, index) =>
              this.buildTodoImageCreateInput(
                todo.id,
                image,
                shouldAssignFirstUploadAsPrimary && index === 0,
              ),
            ),
            tx,
          );
        }

        if (payload.primaryImageId !== undefined) {
          await this.todosRepository.updateManyImages(
            todo.id,
            { isPrimary: false },
            tx,
          );
          await this.todosRepository.updateImage(
            payload.primaryImageId,
            { isPrimary: true },
            tx,
          );
        }
      });
    } catch (error) {
      await this.todoImageStorageService.cleanupUploadedImages(
        uploadedImages.map((image) => image.publicId),
      );
      throw error;
    }

    return this.findOwnedTodoOrThrow(userId, todo.id);
  }

  async deleteCurrentUserTodo(userId: string, todoId: string): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findVisibleTodoOrThrow(userId, todoId);
    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.todosRepository.update(todo.id, { deletedAt }, tx);
      await this.todosRepository.softDeleteImagesByTodoId(
        todo.id,
        deletedAt,
        tx,
      );
    });
  }

  async deleteCurrentUserTodoImage(
    userId: string,
    todoId: string,
    imageId: string,
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findVisibleTodoOrThrow(userId, todoId);
    const image = todo.images.find((entry) => entry.id === imageId);

    if (!image) {
      throw new NotFoundException('Todo image was not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.todosRepository.updateImage(
        image.id,
        {
          deletedAt: new Date(),
          isPrimary: false,
        },
        tx,
      );

      if (image.isPrimary) {
        const nextPrimary = await this.todosRepository.findNextPrimaryImage(
          todo.id,
          image.id,
          tx,
        );

        if (nextPrimary) {
          await this.todosRepository.updateImage(
            nextPrimary.id,
            {
              isPrimary: true,
            },
            tx,
          );
        }
      }
    });

    return this.findOwnedTodoOrThrow(userId, todo.id);
  }

  private resolveSchedule(input: {
    frequency: TodoFrequency;
    startDateInput?: string;
    frequencyDays?: number[];
    occurrenceDates?: string[];
  }): ResolvedRecurringSchedule {
    const startDate = this.parseDateOnly(
      input.startDateInput ?? this.getTodayDateString(),
    );
    const endDate = this.computeEndDate(startDate, input.frequency);

    if (input.frequency === TodoFrequency.ONCE) {
      const isoDate = this.toIsoDate(startDate);

      return {
        frequency: input.frequency,
        startDate,
        endDate,
        frequencyDays: [],
        occurrenceDates: [isoDate],
      };
    }

    if (input.frequency === TodoFrequency.WEEKLY) {
      const frequencyDays = this.normalizeFrequencyDays(input.frequencyDays);
      const occurrenceDates = this.buildWeeklyOccurrenceDates(
        startDate,
        endDate,
        frequencyDays,
      );

      if (occurrenceDates.length === 0) {
        throw new BadRequestException(
          'The selected weekly days do not produce any occurrence in the current schedule window.',
        );
      }

      return {
        frequency: input.frequency,
        startDate,
        endDate,
        frequencyDays,
        occurrenceDates,
      };
    }

    const occurrenceDates = this.normalizeOccurrenceDates(
      input.occurrenceDates,
    );
    if (occurrenceDates.length === 0) {
      throw new BadRequestException(
        'Select at least one occurrence date for this recurring todo.',
      );
    }

    this.assertOccurrenceDatesInRange(occurrenceDates, startDate, endDate);

    return {
      frequency: input.frequency,
      startDate,
      endDate,
      frequencyDays: [],
      occurrenceDates,
    };
  }

  private normalizeFrequencyDays(frequencyDays?: number[]): number[] {
    if (!frequencyDays || frequencyDays.length === 0) {
      throw new BadRequestException(
        'Select at least one weekday for weekly todos.',
      );
    }

    const normalized = Array.from(new Set(frequencyDays)).sort((a, b) => a - b);
    const invalid = normalized.filter((day) => day < 0 || day > 6);

    if (invalid.length > 0) {
      throw new BadRequestException(
        'Weekly recurrence days must be between 0 (Sun) and 6 (Sat).',
      );
    }

    return normalized;
  }

  private normalizeOccurrenceDates(occurrenceDates?: string[]): string[] {
    if (!occurrenceDates) {
      return [];
    }

    const normalized = Array.from(
      new Set(
        occurrenceDates
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );

    return this.sortIsoDates(normalized);
  }

  private assertOccurrenceDatesInRange(
    occurrenceDates: string[],
    startDate: Date,
    endDate: Date,
  ): void {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    for (const dateValue of occurrenceDates) {
      const date = this.parseDateOnly(dateValue);
      const time = date.getTime();

      if (time < startTime || time >= endTime) {
        throw new BadRequestException(
          'Occurrence dates must stay inside the current schedule window.',
        );
      }
    }
  }

  private buildWeeklyOccurrenceDates(
    startDate: Date,
    endDate: Date,
    weekdays: number[],
  ): string[] {
    const dates: string[] = [];

    for (
      let cursor = new Date(startDate);
      cursor.getTime() < endDate.getTime();
      cursor = this.addDays(cursor, 1)
    ) {
      if (weekdays.includes(cursor.getUTCDay())) {
        dates.push(this.toIsoDate(cursor));
      }
    }

    return dates;
  }

  private filterRecordedOccurrenceDates(
    recordedOccurrenceDates: string[],
    occurrenceDates: string[],
  ): string[] {
    return this.sortIsoDates(
      recordedOccurrenceDates.filter((date) => occurrenceDates.includes(date)),
    );
  }

  private assertOccurrenceDateAvailable(
    recordedOccurrenceDate: string,
    occurrenceDates: string[],
    recordedOccurrenceDates: string[],
  ): void {
    if (!occurrenceDates.includes(recordedOccurrenceDate)) {
      throw new BadRequestException(
        'The selected occurrence date is not part of this todo schedule.',
      );
    }

    if (recordedOccurrenceDates.includes(recordedOccurrenceDate)) {
      throw new BadRequestException(
        'This occurrence date has already been recorded to expenses.',
      );
    }
  }

  private resolveSpentAmount(todo: TodoWithImages): Prisma.Decimal {
    if (
      todo.frequency === TodoFrequency.ONCE ||
      todo.remainingAmount === null
    ) {
      return new Prisma.Decimal(0);
    }

    return todo.price.minus(todo.remainingAmount);
  }

  private clampDecimalToZero(value: Prisma.Decimal): Prisma.Decimal {
    return value.lessThanOrEqualTo(0) ? new Prisma.Decimal(0) : value;
  }

  private computeEndDate(startDate: Date, frequency: TodoFrequency): Date {
    switch (frequency) {
      case TodoFrequency.WEEKLY:
        return this.addDays(startDate, 7);
      case TodoFrequency.MONTHLY:
        return this.addMonths(startDate, 1);
      case TodoFrequency.YEARLY:
        return this.addYears(startDate, 1);
      case TodoFrequency.ONCE:
      default:
        return new Date(startDate);
    }
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }

  private addYears(date: Date, years: number): Date {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + years);
    return next;
  }

  private parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      throw new BadRequestException(
        'Dates must use the YYYY-MM-DD ISO format.',
      );
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException('One of the provided dates is invalid.');
    }

    return parsed;
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private sortIsoDates(values: string[]): string[] {
    return [...values].sort((left, right) => left.localeCompare(right, 'en'));
  }

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private async findOwnedTodoOrThrow(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    return this.findVisibleTodoOrThrow(userId, todoId);
  }

  private async findVisibleTodoOrThrow(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const todo = await this.todosRepository.findActiveByIdAndUserIds(
      todoId,
      visibleUserIds,
    );

    if (!todo) {
      throw new NotFoundException('Todo item was not found.');
    }

    return todo;
  }

  private async uploadTodoImages(
    todoId: string,
    todoName: string,
    files: TodoUploadFile[],
  ): Promise<StoredTodoImage[]> {
    this.assertImageLimit(files.length);

    const uploadedImages: StoredTodoImage[] = [];

    try {
      for (const file of files) {
        const uploadedImage =
          await this.todoImageStorageService.uploadTodoImage({
            todoId,
            todoName,
            file,
          });

        uploadedImages.push(uploadedImage);
      }
    } catch (error) {
      await this.todoImageStorageService.cleanupUploadedImages(
        uploadedImages.map((image) => image.publicId),
      );
      throw error;
    }

    return uploadedImages;
  }

  private buildTodoImageCreateInput(
    todoId: string,
    image: StoredTodoImage,
    isPrimary: boolean,
  ): Prisma.TodoImageUncheckedCreateInput {
    return {
      todoId,
      publicId: image.publicId,
      imageUrl: image.imageUrl,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      format: image.format,
      isPrimary,
    };
  }

  private assertImageLimit(imageCount: number): void {
    if (imageCount > MAX_TODO_IMAGES) {
      throw new BadRequestException(
        `A todo item supports up to ${MAX_TODO_IMAGES} images.`,
      );
    }
  }
}
