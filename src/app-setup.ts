import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

export function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const clientUrl = configService.get<string>(
    'CLIENT_URL',
    'http://localhost:4200',
  );
  const cookieSecret = configService.get<string>('COOKIE_SECRET');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Middleware
  app.use(cookieParser(cookieSecret));

  // CORS configuration
  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global response interceptor & exception filter
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Avro E-Commerce API')
    .setDescription('Backend REST API for Avro shop (NestJS, MongoDB, Mongoose)')
    .setVersion('1.0')
    .addCookieAuth('token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'token',
      description: 'JWT stored in HTTP-only cookie',
    })
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument);

  return { configService };
}
