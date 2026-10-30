import { ShortcutImportCredentialTokenService } from './shortcut-import-credential-token.service';

describe('ShortcutImportCredentialTokenService', () => {
  const service = new ShortcutImportCredentialTokenService({
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
  });

  it('generates unique opaque iPhone Shortcut credentials', () => {
    const first = service.generate();
    const second = service.generate();

    expect(first.token).toMatch(/^bfi_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/);
    expect(first.tokenPrefix).toMatch(/^bfi_[a-f0-9]{16}$/);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it('hashes the same token deterministically without storing the token', () => {
    const generated = service.generate();

    expect(service.hash(generated.token)).toBe(generated.tokenHash);
    expect(generated.tokenHash).not.toContain(generated.token);
  });
});
