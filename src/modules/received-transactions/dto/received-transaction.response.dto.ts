import {
  Currency,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceivedTransactionResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    example: 'BGR-MJYD6U04-4BC719DA461E',
  })
  reference!: string;

  @ApiProperty({
    enum: ReceivedTransactionStatus,
  })
  status!: ReceivedTransactionStatus;

  @ApiProperty({
    enum: ReceivedTransactionClassification,
  })
  classification!: ReceivedTransactionClassification;

  @ApiProperty({
    enum: ReceivedTransactionEvidenceSource,
    description:
      'Where the evidence came from. PROVIDER_SMS means structured data parsed by the client from an SMS; it does not mean Budgetify independently verified the transaction with the provider.',
  })
  evidenceSource!: ReceivedTransactionEvidenceSource;

  @ApiProperty({
    enum: Currency,
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({
    example: 25_000,
  })
  amount!: number;

  @ApiPropertyOptional({
    nullable: true,
    example: '+250788123456',
  })
  senderIdentifier!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Jean Claude',
  })
  senderName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '18473920531',
  })
  providerReference!: string | null;

  @ApiProperty({
    format: 'date-time',
  })
  occurredAt!: Date;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date-time',
  })
  reversedAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    format: 'date-time',
  })
  updatedAt!: Date;
}
