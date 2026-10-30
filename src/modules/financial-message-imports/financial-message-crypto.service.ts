import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';

const ENCRYPTION_VERSION = 'v1';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class FinancialMessageCryptoService {
  private readonly key: Buffer;

  constructor(
    @Inject(iphoneShortcutImportConfig.KEY)
    config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {
    this.key = Buffer.from(config.messageEncryptionKey, 'base64');

    if (this.key.length !== 32) {
      throw new Error(
        'IPHONE_SHORTCUT_IMPORT_MESSAGE_ENCRYPTION_KEY must decode to exactly 32 bytes.',
      );
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      ENCRYPTION_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [version, encodedIv, encodedAuthTag, encodedCiphertext, extra] =
      payload.split('.');

    if (
      version !== ENCRYPTION_VERSION ||
      !encodedIv ||
      !encodedAuthTag ||
      !encodedCiphertext ||
      extra
    ) {
      throw new Error('The encrypted financial message has an invalid format.');
    }

    const iv = Buffer.from(encodedIv, 'base64url');
    const authTag = Buffer.from(encodedAuthTag, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('The encrypted financial message has invalid metadata.');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  fingerprint(message: string): string {
    const normalized = message.normalize('NFKC').replace(/\s+/g, ' ').trim();

    return createHmac('sha256', this.key)
      .update('budgetify-financial-message-fingerprint-v1\0', 'utf8')
      .update(normalized, 'utf8')
      .digest('hex');
  }
}
