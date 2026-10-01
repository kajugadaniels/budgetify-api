import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EmailService } from '../../../email/email.service';
import { UsersService } from '../../../users/users.service';
import { PasswordChallengeResponseDto } from '../../dto/password-challenge-response.dto';
import { PasswordChallengeVerifyRequestDto } from '../../dto/password-challenge-verify.request.dto';
import { PasswordChallengeVerifyResponseDto } from '../../dto/password-challenge-verify-response.dto';
import { PasswordStatusResponseDto } from '../../dto/password-status-response.dto';
import { PasswordCredentialRepository } from '../../repositories/password-credential.repository';
import { maskAuthEmail, normalizeAuthEmail } from '../../utils/auth-email.util';
import { OtpService } from '../otp.service';
import { PasswordSetupGrantService } from './password-setup-grant.service';

@Injectable()
export class PasswordChallengeService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly usersService: UsersService,

    private readonly otpService: OtpService,

    private readonly emailService: EmailService,

    private readonly credentialRepository: PasswordCredentialRepository,

    private readonly grantService: PasswordSetupGrantService,
  ) {}

  async getStatus(emailValue: string): Promise<PasswordStatusResponseDto> {
    const email = normalizeAuthEmail(emailValue);

    const user = await this.usersService.findActiveByEmail(email);

    if (!user) {
      return {
        hasPassword: false,
      };
    }

    return {
      hasPassword: await this.credentialRepository.existsByUserId(user.id),
    };
  }

  async request(emailValue: string): Promise<PasswordChallengeResponseDto> {
    const email = normalizeAuthEmail(emailValue);

    const user = await this.usersService.findActiveByEmail(email);

    if (user) {
      const [otp, hasPassword] = await Promise.all([
        this.otpService.createLoginChallenge(user.id),

        this.credentialRepository.existsByUserId(user.id),
      ]);

      await this.emailService.sendPasswordOtpEmail(
        email,
        otp,
        user.firstName,
        hasPassword,
      );
    } else {
      const otp = await this.otpService.createRegisterChallenge(email);

      await this.emailService.sendPasswordOtpEmail(email, otp, null, false);
    }

    const maskedEmail = maskAuthEmail(email);

    return {
      maskedEmail,

      message: `A verification code has been sent to ${maskedEmail}.`,
    };
  }

  async verify(
    payload: PasswordChallengeVerifyRequestDto,
  ): Promise<PasswordChallengeVerifyResponseDto> {
    const email = normalizeAuthEmail(payload.email);

    return this.prisma.$transaction(async (tx) => {
      let user = await this.usersService.findActiveByEmail(email, tx, {
        cancelPendingDeletionOnActivity: true,
      });

      if (user) {
        await this.otpService.consumeLoginChallenge(user.id, payload.otp, tx);
      } else {
        await this.otpService.consumeRegisterChallenge(email, payload.otp, tx);

        user = await this.usersService.createFromEmailVerification(email, tx);

        await tx.authIdentity.create({
          data: {
            userId: user.id,

            provider: AuthProvider.EMAIL,

            providerUserId: email,

            providerEmail: email,
          },
        });
      }

      return this.grantService.issue(user.id, tx);
    });
  }
}
