import { ApiProperty } from '@nestjs/swagger';

import { TransactionEventResponseDto } from './transaction-event.response.dto';
import { TransactionResponseDto } from './transaction.response.dto';

export class TransactionDetailResponseDto extends TransactionResponseDto {
  @ApiProperty({
    type: [TransactionEventResponseDto],
    description: 'Chronological immutable timeline of this transaction.',
  })
  events!: TransactionEventResponseDto[];
}
