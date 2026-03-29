import { ApiProperty } from '@nestjs/swagger';

export class TodoImageResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1711742100/todos/todo-id/sample.jpg',
  })
  imageUrl!: string;

  @ApiProperty({
    example:
      'todos/3e8063c6-714f-482e-8d2c-6b6771ce9e14/renew-car-insurance-20260329-201530-451203',
  })
  publicId!: string;

  @ApiProperty({ example: 1600 })
  width!: number;

  @ApiProperty({ example: 1600 })
  height!: number;

  @ApiProperty({ example: 284512 })
  bytes!: number;

  @ApiProperty({ example: 'jpg' })
  format!: string;

  @ApiProperty({ example: true })
  isPrimary!: boolean;

  @ApiProperty({ example: '2026-03-29T20:15:30.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-29T20:15:30.000Z' })
  updatedAt!: Date;
}
