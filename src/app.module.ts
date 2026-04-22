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
import { CurrencyModule } from './modules/currency/currency.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { IncomeModule } from './modules/income/income.module';
import { LoansModule } from './modules/loans/loans.module';
import { PartnershipsModule } from './modules/partnerships/partnerships.module';
import { SavingsModule } from './modules/savings/savings.module';
import { TodosModule } from './modules/todos/todos.module';
import { UsersModule } from './modules/users/users.module';

const AUTH_PREFIX = `/${API_GLOBAL_PREFIX}/auth`;
const OTP_INITIATE_PREFIX = `${AUTH_PREFIX}/email/initiate`;
const AUTH_LOGIN_PATHS = new Set([
  `${AUTH_PREFIX}/google`,
  `${AUTH_PREFIX}/email/verify`,
]);

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
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? ['.env.production', '.env']
          : ['.env'],
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
      errorMessage: 'Too many requests. Please try again later.',
      throttlers: [
        {
          name: 'auth',
          ttl: 60_000,
          limit: 10,
          skipIf: (context) => {
            const { method, url } = getRequestSignature(context);

            return method !== 'POST' || !AUTH_LOGIN_PATHS.has(url);
          },
        },
        {
          name: 'otp',
          ttl: 900_000,
          limit: 3,
          skipIf: (context) => {
            const { method, url } = getRequestSignature(context);

            return !(method === 'POST' && url.startsWith(OTP_INITIATE_PREFIX));
          },
        },
      ],
    }),
    PrismaModule,
    UsersModule,
    CurrencyModule,
    IncomeModule,
    ExpensesModule,
    SavingsModule,
    LoansModule,
    TodosModule,
    PartnershipsModule,
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
