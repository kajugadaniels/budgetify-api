import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpCodeService } from './otp-code.service';

interface OtpChallenge {
  otpHash: string;

  otpExpiresAt: Date;

  attemptCount: number;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly challengeRepository: OtpChallengeRepository,

    private readonly otpCodeService: OtpCodeService,
  ) {}

  async createLoginChallenge(
    userId: string,
  ): Promise<string> {
    const otp =
      this.otpCodeService.generate();

    await this.challengeRepository.upsertLoginChallenge(
      userId,
      {
        otpHash:
          this.otpCodeService.hash(
            otp,
          ),

        otpExpiresAt:
          this.otpCodeService.buildExpiresAt(),
      },
    );

    return otp;
  }

  async createRegisterChallenge(
    email: string,
  ): Promise<string> {
    const otp =
      this.otpCodeService.generate();

    await this.challengeRepository.upsertRegisterChallenge(
      email,
      {
        otpHash:
          this.otpCodeService.hash(
            otp,
          ),

        otpExpiresAt:
          this.otpCodeService.buildExpiresAt(),
      },
    );

    return otp;
  }

  async consumeLoginChallenge(
    userId: string,
    submittedOtp: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const challenge =
      await this.challengeRepository.findLoginChallenge(
        userId,
        tx,
      );

    this.assertChallengeIsUsable(
      challenge,
      submittedOtp,
    );

    await this.challengeRepository.deleteLoginChallenge(
      userId,
      tx,
    );
  }

  async consumeRegisterChallenge(
    email: string,
    submittedOtp: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const challenge =
      await this.challengeRepository.findRegisterChallenge(
        email,
        tx,
      );

    this.assertChallengeIsUsable(
      challenge,
      submittedOtp,
    );

    await this.challengeRepository.deleteRegisterChallenge(
      email,
      tx,
    );
  }

  private assertChallengeIsUsable(
    challenge: OtpChallenge | null,
    submittedOtp: string,
  ): asserts challenge is OtpChallenge {
    if (!challenge) {
      throw new UnauthorizedException(
        'Invalid or expired OTP.',
      );
    }

    if (
      challenge.otpExpiresAt <=
      new Date()
    ) {
      throw new UnauthorizedException(
        'Invalid or expired OTP.',
      );
    }

    if (
      challenge.attemptCount >=
      this.otpCodeService.maxAttempts
    ) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new code.',
      );
    }

    if (
      !this.otpCodeService.matches(
        submittedOtp,
        challenge.otpHash,
      )
    ) {
      // Preserve the existing best-effort behavior:
      // a failure to persist the counter must not
      // replace the primary authentication error.
      void this.challengeRepository
        .incrementAttemptsByHash(
          challenge.otpHash,
        )
        .catch(
          () => undefined,
        );

      throw new UnauthorizedException(
        'Invalid or expired OTP.',
      );
    }
  }
}