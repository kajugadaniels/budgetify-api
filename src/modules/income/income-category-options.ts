import { IncomeCategory } from '@prisma/client';

import { IncomeCategoryOptionResponseDto } from './dto/income-category-option.response.dto';

export const INCOME_CATEGORY_OPTIONS: ReadonlyArray<IncomeCategoryOptionResponseDto> =
  [
    { value: IncomeCategory.SALARY, label: 'Salary' },
    { value: IncomeCategory.FREELANCE, label: 'Freelance' },
    { value: IncomeCategory.DIVIDENDS, label: 'Dividends' },
    { value: IncomeCategory.RENTAL, label: 'Rental' },
    { value: IncomeCategory.SIDE_HUSTLE, label: 'Side hustle' },
    { value: IncomeCategory.OTHER, label: 'Other' },
  ];
