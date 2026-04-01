import { Saving } from '@prisma/client';

import { SavingResponseDto } from '../dto/saving-response.dto';

export class SavingsMapper {
  static toSavingResponse(saving: Saving): SavingResponseDto {
    return {
      id: saving.id,
      label: saving.label,
      amount: Number(saving.amount),
      date: saving.date,
      note: saving.note,
      stillHave: saving.stillHave,
      createdAt: saving.createdAt,
      updatedAt: saving.updatedAt,
    };
  }

  static toSavingResponseList(savings: Saving[]): SavingResponseDto[] {
    return savings.map((saving) => SavingsMapper.toSavingResponse(saving));
  }
}
