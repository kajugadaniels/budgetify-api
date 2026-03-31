import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { cloudinaryConfig } from './config/cloudinary.config';
import { databaseConfig } from './config/database.config';
import { emailConfig } from './config/email.config';
import { googleConfig } from './config/google.config';
import { validateEnv } from './config/env.validation';
import { API_GLOBAL_PREFIX } from './common/constants/api.constants';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { IncomeModule } from './modules/income/income.module';
import { TodosModule } from './modules/todos/todos.module';
import { UsersModule } from './modules/users/users.module';

const AUTH_PREFIX = `/${API_GLOBAL_PREFIX}/auth`;
const OTP_INITIATE_PREFIX = `${AUTH_PREFIX}/email/initiate`;
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function getRequestSignature(context: ExecutionContext): {
  method: string;
  url: string;
} {
  const request = context.switchToHttp().getRequest<{
    method?: string;
    url?: string;
  }>();

  return {
    method: request.method ?? 'GET',
    url: request.url ?? '',
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        authConfig,
        cloudinaryConfig,
        databaseConfig,
        emailConfig,
        googleConfig,
      ],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      errorMessage: (_context, throttlerLimitDetail) => {
        if (
          throttlerLimitDetail.ttl === 15_000 &&
          throttlerLimitDetail.limit === 1
        ) {
          const retryAfterSeconds = Math.max(
            1,
            throttlerLimitDetail.timeToBlockExpire ||
              Math.ceil(throttlerLimitDetail.ttl / 1000),
          );

          return `Too many requests. Please wait ${retryAfterSeconds} seconds before sending another change.`;
        }

        return 'Too many requests. Please try again later.';
      },
      throttlers: [
        {
          // General API rate limit.
          name: 'default',
          ttl: 60_000,
          limit: 30,
        },
        {
          // Tighter limit for auth endpoints (Google sign-in, token refresh, logout).
          name: 'auth',
          ttl: 60_000,
          limit: 10,
          skipIf: (context) => {
            const { method, url } = getRequestSignature(context);

            return !url.startsWith(AUTH_PREFIX) || method === 'GET';
          },
        },
        {
          // Very tight limit for OTP initiation to prevent email flooding.
          // 3 requests per 15 minutes per IP.
          name: 'otp',
          ttl: 900_000,
          limit: 3,
          skipIf: (context) => {
            const { method, url } = getRequestSignature(context);

            return !(
              method === 'POST' && url.startsWith(OTP_INITIATE_PREFIX)
            );
          },
        },
        {
          // Protect write-heavy finance mutations from rapid duplicate submissions.
          // One mutation is allowed immediately, then the same endpoint unlocks after 15 seconds.
          name: 'write',
          ttl: 15_000,
          limit: 1,
          blockDuration: 15_000,
          skipIf: (context) => {
            const { method, url } = getRequestSignature(context);

            return !WRITE_METHODS.has(method) || url.startsWith(AUTH_PREFIX);
          },
        },
      ],
    }),
    PrismaModule,
    UsersModule,
    IncomeModule,
    ExpensesModule,
    TodosModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
