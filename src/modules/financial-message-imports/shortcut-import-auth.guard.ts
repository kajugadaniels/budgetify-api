import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../../database/prisma/prisma.service';
import { ShortcutImportCredentialTokenService } from '../shortcut-import-credentials/shortcut-import-credential-token.service';
import type { ShortcutImportRequest } from './shortcut-import-auth.types';

const TOKEN_PATTERN = /^(bfi_[a-f0-9]{16})_[A-Za-z0-9_-]{43}$/;

@Injectable()
export class ShortcutImportAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ShortcutImportCredentialTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ShortcutImportRequest>();
    const token = this.bearerToken(request.headers.authorization);
    const match = TOKEN_PATTERN.exec(token);

    if (!match) {
      throw this.unauthorized();
    }

    const credential = await this.prisma.shortcutImportCredential.findUnique({
      where: { tokenPrefix: match[1] },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (
      !credential ||
      credential.revokedAt ||
      credential.expiresAt <= new Date() ||
      !this.matchesHash(credential.tokenHash, this.tokens.hash(token))
    ) {
      throw this.unauthorized();
    }

    request.shortcutCredential = {
      id: credential.id,
      userId: credential.userId,
    };

    await this.prisma.shortcutImportCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  private bearerToken(header: string | undefined): string {
    if (!header) {
      throw this.unauthorized();
    }

    const [scheme, token, extra] = header.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      throw this.unauthorized();
    }

    return token;
  }

  private matchesHash(expectedHex: string, actualHex: string): boolean {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(actualHex, 'hex');

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException(
      'The iPhone Shortcut credential is invalid, expired, or revoked.',
    );
  }
}
