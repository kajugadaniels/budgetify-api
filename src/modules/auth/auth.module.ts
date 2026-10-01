import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordAuthController } from './password-auth.controller';
import { OtpChallengeRepository } from './repositories/otp-challenge.repository';
import { PasswordCredentialRepository } from './repositories/password-credential.repository';
import { PasswordSetupGrantRepository } from './repositories/password-setup-grant.repository';
import { AuthSessionManagementService } from './services/auth-session-management.service';
import { EmailOtpAuthService } from './services/email-otp-auth.service';
import { GoogleAuthFlowService } from './services/google-auth-flow.service';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpCodeService } from './services/otp-code.service';
import { OtpService } from './services/otp.service';
import { PasswordAuthService } from './services/password-auth.service';
import { PasswordChallengeService } from './services/password/password-challenge.service';
import { PasswordCredentialService } from './services/password/password-credential.service';
import { PasswordCryptoService } from './services/password/password-crypto.service';
import { PasswordLoginService } from './services/password/password-login.service';
import { PasswordSetupGrantService } from './services/password/password-setup-grant.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({}),

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    UsersModule,

    EmailModule,
  ],

  controllers: [AuthController, PasswordAuthController],

  providers: [
    OtpChallengeRepository,

    PasswordCredentialRepository,

    PasswordSetupGrantRepository,

    OtpCodeService,

    OtpService,

    PasswordCryptoService,

    PasswordSetupGrantService,

    PasswordChallengeService,

    PasswordCredentialService,

    PasswordLoginService,

    PasswordAuthService,

    GoogleAuthService,

    GoogleAuthFlowService,

    EmailOtpAuthService,

    AuthSessionManagementService,

    SessionService,

    TokenService,

    AuthService,

    JwtStrategy,

    JwtAuthGuard,
  ],
})
export class AuthModule {}
