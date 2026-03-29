import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { IncomeController } from './income.controller';
import { IncomeRepository } from './income.repository';
import { IncomeService } from './income.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  controllers: [IncomeController],
  providers: [IncomeRepository, IncomeService, JwtAuthGuard],
  exports: [IncomeService],
})
export class IncomeModule {}
