import { Expense } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedExpenseResponseDto } from '../dto/paginated-expense.response.dto';
import { ExpenseResponseDto } from '../dto/expense-response.dto';

export class ExpensesMapper {
  static toExpenseResponse(expense: Expense): ExpenseResponseDto {
    return {
      id: expense.id,
      label: expense.label,
      amount: Number(expense.amount),
      category: expense.category,
      date: expense.date,
      note: expense.note,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  static toExpenseResponseList(expenses: Expense[]): ExpenseResponseDto[] {
    return expenses.map((expense) => ExpensesMapper.toExpenseResponse(expense));
  }

  static toPaginatedExpenseResponse(
    payload: PaginatedResponse<Expense>,
  ): PaginatedExpenseResponseDto {
    return {
      items: ExpensesMapper.toExpenseResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
