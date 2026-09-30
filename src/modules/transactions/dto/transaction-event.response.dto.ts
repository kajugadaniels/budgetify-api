import {
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionEventResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    enum: TransactionEventType,
  })
  type!: TransactionEventType;

  @ApiProperty({
    enum: TransactionEventSource,
  })
  source!: TransactionEventSource;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    nullable: true,
  })
  fromStatus!: TransactionStatus | null;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    nullable: true,
  })
  toStatus!: TransactionStatus | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '18473920531',
  })
  providerReference!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
  })
  failureCode!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
  })
  failureReason!: string | null;

  @ApiProperty({
    format: 'date-time',
  })
  occurredAt!: Date;

  @ApiProperty({
    format: 'date-time',
  })
  createdAt!: Date;
}
