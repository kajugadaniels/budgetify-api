import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { PartnershipsController } from './partnerships.controller';
import { PartnershipsRepository } from './partnerships.repository';
import { PartnershipsService } from './partnerships.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    EmailModule,
  ],
  controllers: [PartnershipsController],
  providers: [PartnershipsRepository, PartnershipsService, JwtAuthGuard],
  exports: [PartnershipsService],
})
export class PartnershipsModule {}
