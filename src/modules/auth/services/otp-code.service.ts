import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { authConfig } from '../../../config/auth.config';
import { OTP_CODE_LENGTH, OTP_CODE_SPACE } from '../constants/otp.constants';

@Injectable()
export class OtpCodeService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authSettings: ConfigType<typeof authConfig>,
  ) {}

  generate(): string {
    return randomInt(0, OTP_CODE_SPACE)
      .toString()
      .padStart(OTP_CODE_LENGTH, '0');
  }

  hash(otp: string): string {
    return createHmac('sha256', this.authSettings.otp.hashSecret)
      .update(otp)
      .digest('hex');
  }

  matches(submittedOtp: string, storedHash: string): boolean {
    const candidateHash = this.hash(submittedOtp);

    const stored = Buffer.from(storedHash, 'hex');

    const candidate = Buffer.from(candidateHash, 'hex');

    if (stored.length !== candidate.length) {
      return false;
    }

    return timingSafeEqual(stored, candidate);
  }

  buildExpiresAt(): Date {
    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.authSettings.otp.expiryMinutes,
    );

    return expiresAt;
  }

  get maxAttempts(): number {
    return this.authSettings.otp.maxAttempts;
  }
}
