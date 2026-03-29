import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    OtpService,
    SessionService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
