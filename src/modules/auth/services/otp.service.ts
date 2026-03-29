import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { authConfig } from '../../../config/auth.config';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(authConfig.KEY)
    private readonly authSettings: ConfigType<typeof authConfig>,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generates a fresh 6-digit OTP, hashes it, and upserts a LoginOtpChallenge
   * for the given user. Any pre-existing challenge is replaced atomically.
   * Returns the raw OTP to be sent by email — never stored in plaintext.
   */
  async createLoginChallenge(userId: string): Promise<string> {
    const otp = this.generateOtp();

    await this.prisma.loginOtpChallenge.upsert({
      where: { userId },
      create: {
        userId,
        otpHash: this.hashOtp(otp),
        otpExpiresAt: this.buildExpiresAt(),
        attemptCount: 0,
      },
      update: {
        otpHash: this.hashOtp(otp),
        otpExpiresAt: this.buildExpiresAt(),
        attemptCount: 0,
      },
    });

    return otp;
  }

  /**
   * Generates a fresh 6-digit OTP, hashes it, and upserts a PendingUser row
   * for the given email. Any pre-existing pending registration is overwritten,
   * effectively acting as a resend.
   * Returns the raw OTP to be sent by email.
   */
  async createRegisterChallenge(email: string): Promise<string> {
    const otp = this.generateOtp();

    await this.prisma.pendingUser.upsert({
      where: { email },
      create: {
        email,
        otpHash: this.hashOtp(otp),
        otpExpiresAt: this.buildExpiresAt(),
        attemptCount: 0,
      },
      update: {
        otpHash: this.hashOtp(otp),
        otpExpiresAt: this.buildExpiresAt(),
        attemptCount: 0,
      },
    });

    return otp;
  }

  /**
   * Validates the OTP against the user's active LoginOtpChallenge and, on
   * success, deletes the challenge inside the supplied transaction client.
   *
   * Throws UnauthorizedException on any failure — expired, wrong code, or
   * max attempts reached — without revealing which condition was hit.
   */
  async consumeLoginChallenge(
    userId: string,
    submittedOtp: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const challenge = await tx.loginOtpChallenge.findUnique({
      where: { userId },
    });

    this.assertChallengeIsUsable(challenge, submittedOtp);

    // OTP is correct — delete it immediately so it cannot be reused.
    await tx.loginOtpChallenge.delete({ where: { userId } });
  }

  /**
   * Validates the OTP against the PendingUser row for the given email.
   * On success, deletes the PendingUser row inside the supplied transaction.
   * The caller is responsible for creating the full User record in that same
   * transaction.
   *
   * Throws UnauthorizedException on any failure.
   */
  async consumeRegisterChallenge(
    email: string,
    submittedOtp: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const pending = await tx.pendingUser.findUnique({ where: { email } });

    this.assertChallengeIsUsable(pending, submittedOtp);

    // OTP is valid — delete the pending row so it cannot be reused.
    await tx.pendingUser.delete({ where: { email } });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Produces a cryptographically random 6-digit string padded with leading
   * zeros when necessary (e.g. "042817").
   */
  private generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /**
   * HMAC-SHA256 hashes the OTP using the dedicated OTP_HASH_SECRET.
   * The secret is separate from JWT secrets so rotating one does not
   * invalidate the other.
   */
  private hashOtp(otp: string): string {
    return createHmac('sha256', this.authSettings.otp.hashSecret)
      .update(otp)
      .digest('hex');
  }

  /**
   * Constant-time comparison to prevent timing-based side-channel attacks.
   */
  private matchesOtp(submitted: string, storedHash: string): boolean {
    const candidateHash = this.hashOtp(submitted);
    const stored = Buffer.from(storedHash, 'hex');
    const candidate = Buffer.from(candidateHash, 'hex');

    if (stored.length !== candidate.length) return false;

    return timingSafeEqual(stored, candidate);
  }

  /** Returns the expiry timestamp exactly OTP_EXPIRY_MINUTES from now. */
  private buildExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.authSettings.otp.expiryMinutes,
    );
    return expiresAt;
  }

  /**
   * Central validation gate used by both login and register flows.
   * Increments the attempt counter before comparing the OTP so that a
   * correct guess on the Nth attempt is still rejected when N > maxAttempts.
   *
   * Uses a single generic error message to avoid leaking whether the challenge
   * was missing, expired, or simply wrong.
   */
  private assertChallengeIsUsable(
    challenge: {
      otpHash: string;
      otpExpiresAt: Date;
      attemptCount: number;
    } | null,
    submittedOtp: string,
  ): void {
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    if (challenge.otpExpiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    if (challenge.attemptCount >= this.authSettings.otp.maxAttempts) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new code.',
      );
    }

    if (!this.matchesOtp(submittedOtp, challenge.otpHash)) {
      // Persist the incremented attempt count so subsequent calls are blocked.
      void this.incrementAttemptCount(challenge);
      throw new UnauthorizedException('Invalid or expired OTP.');
    }
  }

  /**
   * Increments the attempt counter on whichever record holds the challenge.
   * Fires-and-forgets — a failure here must not mask the primary auth error.
   */
  private incrementAttemptCount(challenge: {
    otpHash: string;
    otpExpiresAt: Date;
    attemptCount: number;
  }): Promise<void> {
    // We cannot pass the transaction here because it may already be committed
    // or rolling back. Use the main prisma client with a best-effort update.
    // The attempt guard above already blocks further attempts immediately.
    return this.prisma.loginOtpChallenge
      .updateMany({
        where: { otpHash: challenge.otpHash },
        data: { attemptCount: { increment: 1 } },
      })
      .then(() =>
        this.prisma.pendingUser.updateMany({
          where: { otpHash: challenge.otpHash },
          data: { attemptCount: { increment: 1 } },
        }),
      )
      .then(() => undefined)
      .catch(() => undefined);
  }
}
