import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseEnvelopeExceptionFilter } from '../infrastructure/entrypoints/rest/utilities/response-envelope.filter';
import { ResponseEnvelopeInterceptor } from '../infrastructure/entrypoints/rest/utilities/response-envelope.interceptor';

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // OWASP baseline: security headers, strict payload validation, scoped CORS.
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '*').split(',').map((value) => value.trim()),
    methods: ['GET', 'POST'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Every response, success or failure, leaves through the same envelope.
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new ResponseEnvelopeExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Payments API')
    .setDescription('Checkout API: products, customers, transactions and deliveries.')
    .setVersion('1.0.0')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port, '0.0.0.0');

  Logger.log(`API listening on port ${port} (docs at /api/docs)`, 'Bootstrap');
}

void bootstrap();
