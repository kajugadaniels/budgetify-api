import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

import { CreateExpenseRequestDto } from '../../expenses/dto/create-expense.request.dto';

export class CreateTodoExpenseRequestDto extends CreateExpenseRequestDto {
  @ApiPropertyOptional({
    description:
      'Todo occurrence date being recorded. Defaults to the expense date when omitted.',
    example: '2026-04-22',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'occurrenceDate must be a valid ISO date string (YYYY-MM-DD).',
    },
  )
  occurrenceDate?: string;
}
