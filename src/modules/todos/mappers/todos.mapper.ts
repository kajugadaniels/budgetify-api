import { TodoImage } from '@prisma/client';

import { TodoImageResponseDto } from '../dto/todo-image-response.dto';
import { TodoResponseDto } from '../dto/todo-response.dto';
import { TodoWithImages } from '../todos.repository';

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
      coverImageUrl: coverImage?.imageUrl ?? null,
      imageCount: todo.images.length,
      images: todo.images.map((image) =>
        TodosMapper.toTodoImageResponse(image),
      ),
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };
  }

  static toTodoResponseList(todos: TodoWithImages[]): TodoResponseDto[] {
    return todos.map((todo) => TodosMapper.toTodoResponse(todo));
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
