import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { ShortcutImportCredentialTokenService } from '../shortcut-import-credentials/shortcut-import-credential-token.service';
import { ShortcutImportAuthGuard } from './shortcut-import-auth.guard';
import type { ShortcutImportRequest } from './shortcut-import-auth.types';

describe('ShortcutImportAuthGuard', () => {
  const config = {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
  };
  const tokens = new ShortcutImportCredentialTokenService(config);
  const credential = tokens.generate();
  const shortcutImportCredential = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { shortcutImportCredential } as unknown as PrismaService;
  const guard = new ShortcutImportAuthGuard(prisma, tokens);

  beforeEach(() => {
    jest.resetAllMocks();
    shortcutImportCredential.findUnique.mockResolvedValue({
      id: 'credential-id',
      userId: 'owner-id',
      tokenHash: credential.tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    shortcutImportCredential.update.mockResolvedValue({});
  });

  it('authenticates a valid scoped token and attaches its owner', async () => {
    const request = thisRequest(`Bearer ${credential.token}`);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.shortcutCredential).toEqual({
      id: 'credential-id',
      userId: 'owner-id',
    });
    expect(shortcutImportCredential.update).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed, revoked, and expired tokens generically', async () => {
    await expect(
      guard.canActivate(contextFor(thisRequest('Bearer invalid'))),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    for (const state of [
      { revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
      { revokedAt: null, expiresAt: new Date(Date.now() - 60_000) },
    ]) {
      shortcutImportCredential.findUnique.mockResolvedValue({
        id: 'credential-id',
        userId: 'owner-id',
        tokenHash: credential.tokenHash,
        ...state,
      });

      await expect(
        guard.canActivate(
          contextFor(thisRequest(`Bearer ${credential.token}`)),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });
});

function thisRequest(authorization: string): ShortcutImportRequest {
  return {
    headers: { authorization },
  } as unknown as ShortcutImportRequest;
}

function contextFor(request: ShortcutImportRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
