import { Injectable } from '@nestjs/common';
import { Prisma, Todo, TodoImage } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

export const activeTodoImagesInclude = {
  images: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.TodoInclude;

export type TodoWithImages = Prisma.TodoGetPayload<{
  include: typeof activeTodoImagesInclude;
}>;

@Injectable()
export class TodosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages[]> {
    return db.todo.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: activeTodoImagesInclude,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findActiveByIdAndUserId(
    id: string,
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages | null> {
    return db.todo.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: activeTodoImagesInclude,
    });
  }

  async findActiveImageByIdAndTodoId(
    id: string,
    todoId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage | null> {
    return db.todoImage.findFirst({
      where: {
        id,
        todoId,
        deletedAt: null,
      },
    });
  }

  async findNextPrimaryImage(
    todoId: string,
    excludedImageId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage | null> {
    return db.todoImage.findFirst({
      where: {
        todoId,
        deletedAt: null,
        id: {
          not: excludedImageId,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async create(
    data: Prisma.TodoUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Todo> {
    return db.todo.create({ data });
  }

  async update(
    id: string,
    data: Prisma.TodoUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages> {
    return db.todo.update({
      where: { id },
      data,
      include: activeTodoImagesInclude,
    });
  }

  async createTodoImages(
    data: Prisma.TodoImageUncheckedCreateInput[],
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage[]> {
    return Promise.all(
      data.map((image) =>
        db.todoImage.create({
          data: image,
        }),
      ),
    );
  }

  async updateImage(
    id: string,
    data: Prisma.TodoImageUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage> {
    return db.todoImage.update({
      where: { id },
      data,
    });
  }

  async updateManyImages(
    todoId: string,
    data: Prisma.TodoImageUpdateManyMutationInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.todoImage.updateMany({
      where: {
        todoId,
        deletedAt: null,
      },
      data,
    });
  }

  async softDeleteImagesByTodoId(
    todoId: string,
    deletedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.todoImage.updateMany({
      where: {
        todoId,
        deletedAt: null,
      },
      data: {
        deletedAt,
        isPrimary: false,
      },
    });
  }
}
