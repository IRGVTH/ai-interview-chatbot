import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpLoggingInterceptor } from "./common/logging/http-logging.interceptor";
import { AllExceptionsFilter } from "./common/logging/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 app.enableCors({
    origin: ["http://localhost:3000"],
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

bootstrap();