import { OmitType } from '@nestjs/swagger';

import { ListLoansQueryDto } from './list-loans.query.dto';

export class LoanReportingQueryDto extends OmitType(ListLoansQueryDto, [
  'page',
  'limit',
] as const) {}
