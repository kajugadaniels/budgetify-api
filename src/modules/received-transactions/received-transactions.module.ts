import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReceivedTransactionsController } from './received-transactions.controller';
import { ReceivedTransactionsRepository } from './received-transactions.repository';
import { ReceivedTransactionsService } from './received-transactions.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [ReceivedTransactionsController],

  providers: [
    ReceivedTransactionsRepository,
    ReceivedTransactionsService,
    JwtAuthGuard,
  ],

  exports: [ReceivedTransactionsRepository, ReceivedTransactionsService],
})
export class ReceivedTransactionsModule {}
