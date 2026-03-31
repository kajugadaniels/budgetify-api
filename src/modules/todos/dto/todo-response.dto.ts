import { ApiProperty } from '@nestjs/swagger';
import { TodoPriority } from '@prisma/client';

import { TodoImageResponseDto } from './todo-image-response.dto';

export class TodoResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Renew car insurance' })
  name!: string;

  @ApiProperty({ example: 85000 })
  price!: number;

  @ApiProperty({
    enum: TodoPriority,
    example: TodoPriority.TOP_PRIORITY,
  })
  priority!: TodoPriority;

  @ApiProperty({
    example: false,
    description: 'Whether the todo item has already been completed.',
  })
  done!: boolean;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1711742100/todos/todo-id/sample.jpg',
    nullable: true,
  })
  coverImageUrl!: string | null;

  @ApiProperty({ example: 3 })
  imageCount!: number;

  @ApiProperty({
    type: TodoImageResponseDto,
    isArray: true,
  })
  images!: TodoImageResponseDto[];

  @ApiProperty({ example: '2026-03-29T20:15:30.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-29T20:15:30.000Z' })
  updatedAt!: Date;
}
