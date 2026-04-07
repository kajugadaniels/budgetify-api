import { registerAs } from '@nestjs/config';

import { API_PREFIX, API_VERSION } from '../common/constants/api.constants';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: API_PREFIX,
  apiVersion: API_VERSION,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  mobileAppInviteUrl:
    process.env.MOBILE_APP_INVITE_URL ?? 'budgetify://partnership/accept',
}));
