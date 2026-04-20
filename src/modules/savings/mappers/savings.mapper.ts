import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedSavingResponseDto } from '../dto/paginated-saving.response.dto';
import { SavingResponseDto } from '../dto/saving-response.dto';
import { SavingWithCreator } from '../savings.repository';

export class SavingsMapper {
  static toSavingResponse(saving: SavingWithCreator): SavingResponseDto {
    return {
      id: saving.id,
      label: saving.label,
      amount: Number(saving.amount),
      currency: saving.currency,
      amountRwf: Number(saving.amountRwf),
      date: saving.date,
      note: saving.note,
      stillHave: saving.stillHave,
      createdAt: saving.createdAt,
      updatedAt: saving.updatedAt,
      createdBy: {
        id: saving.user.id,
        firstName: saving.user.firstName,
        lastName: saving.user.lastName,
        avatarUrl: saving.user.avatarUrl,
      },
    };
  }

  static toSavingResponseList(
    savings: SavingWithCreator[],
  ): SavingResponseDto[] {
    return savings.map((saving) => SavingsMapper.toSavingResponse(saving));
  }

  static toPaginatedSavingResponse(
    payload: PaginatedResponse<SavingWithCreator>,
  ): PaginatedSavingResponseDto {
    return {
      items: SavingsMapper.toSavingResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
