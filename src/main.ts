import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { API_GLOBAL_PREFIX } from './common/constants/api.constants';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableShutdownHooks();
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  setupSwagger(app);

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/${API_GLOBAL_PREFIX}`);
}

void bootstrap();
