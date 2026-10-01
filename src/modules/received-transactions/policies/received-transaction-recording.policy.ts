import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export function assertReceivedSenderPresent(
  senderIdentifier: string | undefined,
  senderName: string | undefined,
  message: string,
): void {
  if (!senderIdentifier && !senderName) {
    throw new BadRequestException(message);
  }
}

export function assertReceivedOccurrenceTime(occurredAt: Date): void {
  const maximumFutureTime = Date.now() + 5 * 60 * 1000;

  if (
    Number.isNaN(occurredAt.getTime()) ||
    occurredAt.getTime() > maximumFutureTime
  ) {
    throw new BadRequestException(
      'Received transaction time cannot be in the future.',
    );
  }
}

export function normalizeReceivedSenderIdentifier(
  value?: string,
): string | null {
  if (!value) {
    return null;
  }

  const compact = value.replace(/[\s()+-]/g, '');

  if (/^07\d{8}$/.test(compact)) {
    return `+250${compact.slice(1)}`;
  }

  if (/^2507\d{8}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^7\d{8}$/.test(compact)) {
    return `+250${compact}`;
  }

  return value;
}

export function createReceivedTransactionReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();

  const entropy = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

  return `BGR-${timestamp}-${entropy}`;
}
