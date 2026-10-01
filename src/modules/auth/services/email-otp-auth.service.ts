import { Injectable } from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';

import { RequestMetadata } from '../../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../../users/users.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { EmailInitiateRequestDto } from '../dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from '../dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from '../dto/email-verify.request.dto';
import { AuthMapper } from '../mappers/auth.mapper';
import { maskAuthEmail, normalizeAuthEmail } from '../utils/auth-email.util';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';

@Injectable()
export class EmailOtpAuthService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly usersService: UsersService,

    private readonly otpService: OtpService,

    private readonly emailService: EmailService,

    private readonly sessionService: SessionService,
  ) {}

  async initiate(
    payload: EmailInitiateRequestDto,
  ): Promise<EmailInitiateResponseDto> {
    const email = normalizeAuthEmail(payload.email);

    const existingUser = await this.usersService.findActiveByEmail(
      email,
      undefined,
      {
        cancelPendingDeletionOnActivity: true,
      },
    );

    if (existingUser) {
      const otp = await this.otpService.createLoginChallenge(existingUser.id);

      await this.emailService.sendOtpLoginEmail(
        email,
        otp,
        existingUser.firstName,
      );

      const maskedEmail = maskAuthEmail(email);

      return {
        action: 'login',

        maskedEmail,

        message: `A sign-in code has been sent to ${maskedEmail}.`,
      };
    }

    const otp = await this.otpService.createRegisterChallenge(email);

    await this.emailService.sendOtpRegisterEmail(email, otp);

    const maskedEmail = maskAuthEmail(email);

    return {
      action: 'register',

      maskedEmail,

      message: `Welcome! A verification code has been sent to ${maskedEmail}.`,
    };
  }

  async verify(
    payload: EmailVerifyRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const email = normalizeAuthEmail(payload.email);

    const existingUser = await this.usersService.findActiveByEmail(
      email,
      undefined,
      {
        cancelPendingDeletionOnActivity: true,
      },
    );

    if (existingUser) {
      return this.completeLogin(existingUser, payload.otp, metadata);
    }

    return this.completeRegistration(email, payload.otp, metadata);
  }

  private async completeLogin(
    user: User,
    otp: string,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.otpService.consumeLoginChallenge(user.id, otp, tx);

      const updatedUser = await tx.user.update({
        where: {
          id: user.id,
        },

        data: {
          lastLoginAt: new Date(),

          accountDeletionRequestedAt: null,

          accountDeletionScheduledFor: null,
        },
      });

      const tokens = await this.sessionService.createAuthenticatedSession({
        user: updatedUser,

        metadata,

        db: tx,
      });

      return {
        user: updatedUser,

        tokens,
      };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  private async completeRegistration(
    email: string,
    otp: string,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.otpService.consumeRegisterChallenge(email, otp, tx);

      const user = await this.usersService.createFromEmailVerification(
        email,
        tx,
      );

      await tx.authIdentity.create({
        data: {
          userId: user.id,

          provider: AuthProvider.EMAIL,

          providerUserId: email,

          providerEmail: email,
        },
      });

      const tokens = await this.sessionService.createAuthenticatedSession({
        user,

        metadata,

        db: tx,
      });

      return {
        user,

        tokens,
      };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }
}
