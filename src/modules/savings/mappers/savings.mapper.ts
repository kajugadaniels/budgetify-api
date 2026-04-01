import { Saving } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedSavingResponseDto } from '../dto/paginated-saving.response.dto';
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

  static toPaginatedSavingResponse(
    payload: PaginatedResponse<Saving>,
  ): PaginatedSavingResponseDto {
    return {
      items: SavingsMapper.toSavingResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
