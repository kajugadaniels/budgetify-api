import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Resend } from 'resend';

import { emailConfig } from '../../config/email.config';
import { buildAccountDeletionRequestEmail } from './templates/account-deletion-request.email';
import { buildOtpLoginEmail } from './templates/otp-login.email';
import { buildPasswordOtpEmail } from './templates/otp-password.email';
import { buildOtpRegisterEmail } from './templates/otp-register.email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly config: ConfigType<typeof emailConfig>,
  ) {
    this.resend = new Resend(config.apiKey);
  }

  /**
   * Sends a sign-in OTP to a verified, existing user.
   * The first name is used to personalise the greeting when available.
   */
  async sendOtpLoginEmail(
    to: string,
    otp: string,
    firstName: string | null,
  ): Promise<void> {
    const { subject, html } = buildOtpLoginEmail(otp, firstName);
    await this.send(to, subject, html);
  }

  /**
   * Sends a welcome + verification OTP to a new user who has never
   * logged in before. Moves them from PendingUser to User on success.
   */
  async sendOtpRegisterEmail(to: string, otp: string): Promise<void> {
    const { subject, html } = buildOtpRegisterEmail(otp, to);
    await this.send(to, subject, html);
  }

  async sendPasswordOtpEmail(
    to: string,
    otp: string,
    firstName: string | null,
    isRecovery: boolean,
  ): Promise<void> {
    const { subject, html } = buildPasswordOtpEmail(otp, firstName, isRecovery);
    await this.send(to, subject, html);
  }

  async sendAccountDeletionRequestEmail(
    to: string,
    firstName: string | null,
    scheduledFor: Date,
  ): Promise<void> {
    const { subject, html } = buildAccountDeletionRequestEmail(
      firstName,
      scheduledFor,
    );
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.config.from,
        to,
        subject,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      // Log the error but re-throw so the caller can surface it.
      // The controller layer should not swallow delivery failures silently.
      this.logger.error(
        `Failed to deliver email to ${to} (subject: "${subject}"): ${String(error)}`,
      );
      throw error;
    }
  }
}
