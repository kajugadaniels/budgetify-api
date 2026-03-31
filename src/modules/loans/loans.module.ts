import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { UsersModule } from '../users/users.module';
import { LoansController } from './loans.controller';
import { LoansRepository } from './loans.repository';
import { LoansService } from './loans.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  controllers: [LoansController],
  providers: [LoansRepository, ExpensesRepository, LoansService, JwtAuthGuard],
  exports: [LoansService],
})
export class LoansModule {}
