import { ExpenseCategory } from '@prisma/client';

import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';

export const EXPENSE_CATEGORY_OPTIONS: ExpenseCategoryOptionResponseDto[] = [
  { value: ExpenseCategory.FOOD_DINING, label: 'Food and dining' },
  { value: ExpenseCategory.TRANSPORT, label: 'Transport' },
  { value: ExpenseCategory.HOUSING, label: 'Housing' },
  { value: ExpenseCategory.LOAN, label: 'Loan' },
  { value: ExpenseCategory.UTILITIES, label: 'Utilities' },
  { value: ExpenseCategory.HEALTHCARE, label: 'Healthcare' },
  { value: ExpenseCategory.EDUCATION, label: 'Education' },
  { value: ExpenseCategory.ENTERTAINMENT, label: 'Entertainment' },
  { value: ExpenseCategory.SHOPPING, label: 'Shopping' },
  { value: ExpenseCategory.PERSONAL_CARE, label: 'Personal care' },
  { value: ExpenseCategory.TRAVEL, label: 'Travel' },
  { value: ExpenseCategory.SAVINGS, label: 'Savings' },
  { value: ExpenseCategory.OTHER, label: 'Other' },
];
