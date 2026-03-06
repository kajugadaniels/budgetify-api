import { Request } from 'express';

import { RequestMetadata } from '../interfaces/request-metadata.interface';

export function extractRequestMetadata(request: Request): RequestMetadata {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  return {
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
    ipAddress: forwardedIp ?? request.ip ?? null,
  };
}
