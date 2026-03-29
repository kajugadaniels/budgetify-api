import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { emailConfig } from '../../config/email.config';
import { buildOtpLoginEmail } from './templates/otp-login.email';
import { buildOtpRegisterEmail } from './templates/otp-register.email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly config: ConfigType<typeof emailConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
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

  private async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.address}>`,
        to,
        subject,
        html,
      });
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
