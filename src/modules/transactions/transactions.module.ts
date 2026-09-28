import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionFeeCalculatorService } from './services/transaction-fee-calculator.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [TransactionsController],
  providers: [
    TransactionsRepository,
    TransactionsService,
    TransactionFeeCalculatorService,
    JwtAuthGuard,
  ],
  exports: [TransactionsService, TransactionFeeCalculatorService],
})
export class TransactionsModule {}
