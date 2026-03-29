import { Module } from '@nestjs/common';
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
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { IncomeModule } from './modules/income/income.module';
import { TodosModule } from './modules/todos/todos.module';
import { UsersModule } from './modules/users/users.module';

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
    ThrottlerModule.forRoot([
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
      },
      {
        // Very tight limit for OTP initiation to prevent email flooding.
        // 3 requests per 15 minutes per IP.
        name: 'otp',
        ttl: 900_000,
        limit: 3,
      },
    ]),
    PrismaModule,
    UsersModule,
    IncomeModule,
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
