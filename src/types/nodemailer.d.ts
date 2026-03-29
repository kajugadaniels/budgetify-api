declare module 'nodemailer' {
  export interface MailAuth {
    user: string;
    pass: string;
  }

  export interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: MailAuth;
  }

  export interface SendMailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
  }

  export interface SentMessageInfo {
    messageId?: string;
  }

  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(options: TransportOptions): Transporter;
}
