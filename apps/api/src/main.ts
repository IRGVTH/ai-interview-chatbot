import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/logging/http-logging.interceptor';
import { AllExceptionsFilter } from './common/logging/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendOrigins = process.env.FRONTEND_URL?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? ['http://localhost:3000'];

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
