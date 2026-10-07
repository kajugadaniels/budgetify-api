import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

@Module({ imports: [PrismaModule, AuthModule], controllers: [IncomesController], providers: [IncomesService] })
export class IncomesModule {}
