const DURATION_UNITS_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToMilliseconds(value: string | number): number {
  if (typeof value === 'number') {
    return value * 1_000;
  }

  const normalized = value.trim();

  if (/^\d+$/.test(normalized)) {
    return Number(normalized) * 1_000;
  }

  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const [, amount, unit] = match;

  return Number(amount) * DURATION_UNITS_TO_MS[unit.toLowerCase()];
}

export function parseDurationToSeconds(value: string | number): number {
  return Math.floor(parseDurationToMilliseconds(value) / 1_000);
}

export function buildExpirationDate(value: string | number): Date {
  return new Date(Date.now() + parseDurationToMilliseconds(value));
}
