import { ReceivedTransactionClassification } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateReceivedTransactionClassificationRequestDto {
  @ApiProperty({
    enum: ReceivedTransactionClassification,
    example: ReceivedTransactionClassification.REIMBURSEMENT,
    description:
      'User-managed classification for the received payment. Updating this field does not alter the payment amount, status, or evidence provenance.',
  })
  @IsEnum(ReceivedTransactionClassification)
  classification!: ReceivedTransactionClassification;
}
