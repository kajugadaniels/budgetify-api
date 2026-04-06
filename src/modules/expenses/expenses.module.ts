import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PartnershipsModule } from '../partnerships/partnerships.module';
import { UsersModule } from '../users/users.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    PartnershipsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesRepository, ExpensesService, JwtAuthGuard],
  exports: [ExpensesService],
})
export class ExpensesModule {}
