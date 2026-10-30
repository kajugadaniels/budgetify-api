import { FinancialMessageCryptoService } from './financial-message-crypto.service';

describe('FinancialMessageCryptoService', () => {
  const service = new FinancialMessageCryptoService({
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
  });

  it('encrypts message text with authenticated encryption', () => {
    const plaintext = 'You received RWF 25,000. Ref: ABC123.';
    const encrypted = service.encrypt(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('rejects modified ciphertext', () => {
    const encrypted = service.encrypt('Sensitive message');
    const replacement = encrypted.endsWith('A') ? 'B' : 'A';
    const modified = `${encrypted.slice(0, -1)}${replacement}`;

    expect(() => service.decrypt(modified)).toThrow();
  });

  it('creates stable whitespace-normalized keyed fingerprints', () => {
    expect(service.fingerprint('Payment   received')).toBe(
      service.fingerprint(' Payment received '),
    );
    expect(service.fingerprint('Payment received')).not.toBe(
      service.fingerprint('Payment sent'),
    );
  });
});
