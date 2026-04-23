import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedExpenseResponseDto } from '../dto/paginated-expense.response.dto';
import { ExpenseResponseDto } from '../dto/expense-response.dto';
import { ExpenseWithCreator } from '../expenses.repository';

export class ExpensesMapper {
  static toExpenseResponse(expense: ExpenseWithCreator): ExpenseResponseDto {
    return {
      id: expense.id,
      label: expense.label,
      amount: Number(expense.amount),
      currency: expense.currency,
      amountRwf: Number(expense.amountRwf),
      feeAmount: Number(expense.feeAmount),
      feeAmountRwf: Number(expense.feeAmountRwf),
      totalAmountRwf: Number(expense.totalAmountRwf),
      paymentMethod: expense.paymentMethod,
      mobileMoneyChannel: expense.mobileMoneyChannel,
      mobileMoneyProvider: expense.mobileMoneyProvider,
      mobileMoneyNetwork: expense.mobileMoneyNetwork,
      category: expense.category,
      date: expense.date,
      note: expense.note,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      createdBy: {
        id: expense.user.id,
        firstName: expense.user.firstName,
        lastName: expense.user.lastName,
        avatarUrl: expense.user.avatarUrl,
      },
      linkedTodo:
        expense.todoRecording && expense.todoRecording.reversedAt === null
          ? {
              todoId: expense.todoRecording.todo.id,
              todoName: expense.todoRecording.todo.name,
              recordingId: expense.todoRecording.id,
              occurrenceDate: expense.todoRecording.occurrenceDate
                .toISOString()
                .slice(0, 10),
            }
          : null,
    };
  }

  static toExpenseResponseList(
    expenses: ExpenseWithCreator[],
  ): ExpenseResponseDto[] {
    return expenses.map((expense) => ExpensesMapper.toExpenseResponse(expense));
  }

  static toPaginatedExpenseResponse(
    payload: PaginatedResponse<ExpenseWithCreator>,
  ): PaginatedExpenseResponseDto {
    return {
      items: ExpensesMapper.toExpenseResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
