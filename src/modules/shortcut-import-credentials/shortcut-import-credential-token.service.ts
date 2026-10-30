import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';

export interface GeneratedShortcutImportCredential {
  token: string;
  tokenPrefix: string;
  tokenHash: string;
}

@Injectable()
export class ShortcutImportCredentialTokenService {
  constructor(
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  generate(): GeneratedShortcutImportCredential {
    const tokenPrefix = `bfi_${randomBytes(8).toString('hex')}`;
    const token = `${tokenPrefix}_${randomBytes(32).toString('base64url')}`;

    return {
      token,
      tokenPrefix,
      tokenHash: this.hash(token),
    };
  }

  hash(token: string): string {
    return createHmac('sha256', this.config.tokenPepper)
      .update(token, 'utf8')
      .digest('hex');
  }
}
