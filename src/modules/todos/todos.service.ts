import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateTodoRequestDto } from './dto/create-todo.request.dto';
import { UpdateTodoRequestDto } from './dto/update-todo.request.dto';
import {
  MAX_TODO_IMAGES,
  StoredTodoImage,
  TodoImageStorageService,
  TodoUploadFile,
} from './services/todo-image-storage.service';
import { TodoWithImages, TodosRepository } from './todos.repository';

@Injectable()
export class TodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todosRepository: TodosRepository,
    private readonly usersService: UsersService,
    private readonly todoImageStorageService: TodoImageStorageService,
  ) {}

  async listCurrentUserTodos(userId: string): Promise<TodoWithImages[]> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.todosRepository.findManyByUserId(userId);
  }

  async getCurrentUserTodo(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.findOwnedTodoOrThrow(userId, todoId);
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

    const todo = await this.todosRepository.create({
      userId,
      name: payload.name,
      price: new Prisma.Decimal(payload.price),
      priority: payload.priority,
      done: payload.done,
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
      payload.primaryImageId === undefined &&
      files.length === 0
    ) {
      throw new BadRequestException(
        'Provide at least one todo field or image to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findOwnedTodoOrThrow(userId, todoId);
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
            done: payload.done,
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

    const todo = await this.findOwnedTodoOrThrow(userId, todoId);
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

    const todo = await this.findOwnedTodoOrThrow(userId, todoId);
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

  private async findOwnedTodoOrThrow(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    const todo = await this.todosRepository.findActiveByIdAndUserId(
      todoId,
      userId,
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
