import { Loan } from '@prisma/client';

import { LoanResponseDto } from '../dto/loan-response.dto';

export class LoansMapper {
  static toLoanResponse(loan: Loan): LoanResponseDto {
    return {
      id: loan.id,
      label: loan.label,
      amount: Number(loan.amount),
      date: loan.date,
      paid: loan.paid,
      note: loan.note,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };
  }

  static toLoanResponseList(loans: Loan[]): LoanResponseDto[] {
    return loans.map((loan) => LoansMapper.toLoanResponse(loan));
  }
}
