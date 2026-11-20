import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app-setup';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const { configService } = configureApp(app);
  const port = configService.get<number>('PORT', 5000);

  await app.listen(port);
  logger.log(`Server is running on: http://localhost:${port}/api/v1`);
  logger.log(
    `Swagger documentation: http://localhost:${port}/api/v1/docs and http://localhost:${port}/api/docs`,
  );
}

void bootstrap();
