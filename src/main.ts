import { Logger, ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { API_GLOBAL_PREFIX } from './common/constants/api.constants';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const host =
    process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const configuredCorsOrigins = configService.get<string>(
    'CORS_ALLOWED_ORIGINS',
  );
  const corsOrigins = configuredCorsOrigins ?? frontendUrl ?? '';
  const allowedCorsOrigins: string[] = corsOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      const isAllowedOrigin = allowedCorsOrigins.some((allowedOrigin) => {
        if (allowedOrigin.endsWith(':*')) {
          return origin?.startsWith(allowedOrigin.slice(0, -1)) ?? false;
        }

        return origin === allowedOrigin;
      });

      if (origin === undefined || isAllowedOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  };

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableShutdownHooks();
  app.enableCors(corsOptions);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  setupSwagger(app);

  await app.listen(port, host);
  logger.log(
    `API running on http://${host}:${port}/${API_GLOBAL_PREFIX}`,
  );
}

void bootstrap();
