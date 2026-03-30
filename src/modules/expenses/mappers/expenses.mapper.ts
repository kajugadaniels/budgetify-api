import { Expense } from '@prisma/client';

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
}
