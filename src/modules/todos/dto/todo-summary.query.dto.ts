import { OmitType } from '@nestjs/swagger';

import { ListTodosQueryDto } from './list-todos.query.dto';

export class TodoSummaryQueryDto extends OmitType(ListTodosQueryDto, [
  'page',
  'limit',
] as const) {}
