import { registerAs } from '@nestjs/config';

import { TokenType } from '../common/enums/token-type.enum';

export const authConfig = registerAs('auth', () => ({
  issuer: 'budgetify-api',
  tokenType: TokenType.BEARER,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as string,
  },
  otp: {
    /** Secret used to HMAC-hash 6-digit OTP codes before DB storage. */
    hashSecret: process.env.OTP_HASH_SECRET as string,
    /** Minutes before an OTP challenge expires. */
    expiryMinutes: 10,
    /** Maximum failed verify attempts before the challenge is invalidated. */
    maxAttempts: 5,
  },
}));
