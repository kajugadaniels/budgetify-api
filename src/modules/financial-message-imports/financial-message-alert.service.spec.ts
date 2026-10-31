import { FinancialMessageAlertService } from './financial-message-alert.service';

function config(alertWebhookUrl: string | null) {
  return {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
    mode: 'pilot' as const,
    enabledProviderCodes: ['MTN_MOMO_RW'],
    alertMinimumSampleSize: 10,
    alertNeedsReviewPercent: 30,
    currentShortcutVersion: 1,
    minimumShortcutVersion: 1,
    shortcutInstallUrl: null,
    cleanupIntervalMinutes: 360,
    alertWebhookUrl,
  };
}

describe('FinancialMessageAlertService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not make a request when alert delivery is not configured', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new FinancialMessageAlertService(config(null));

    await service.notify('pilot_alert', { sampleSize: 20 });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends only the supplied privacy-safe metadata', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 202,
    } as Response);
    const service = new FinancialMessageAlertService(
      config('https://alerts.example.com/budgetify'),
    );

    await service.notify('pilot_alert', {
      providerCode: 'MTN_MOMO_RW',
      needsReviewPercent: 12,
    });

    const [requestUrl, requestOptions] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(requestUrl).toBe('https://alerts.example.com/budgetify');
    expect(requestOptions.method).toBe('POST');
    expect(typeof requestOptions.body).toBe('string');
    expect(requestOptions.body).not.toContain('message');
  });
});
