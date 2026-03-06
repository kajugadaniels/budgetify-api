import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  API_GLOBAL_PREFIX,
  SWAGGER_PATH,
} from '../common/constants/api.constants';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Budgetify API')
    .setDescription(
      'Production-ready authentication API for Budgetify. Google ID tokens are verified server-side and exchanged for first-party JWT access and refresh tokens.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Budgetify access token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(`${API_GLOBAL_PREFIX}/${SWAGGER_PATH}`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  });
}
