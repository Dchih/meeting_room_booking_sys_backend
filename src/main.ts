import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FormatResponseInterceptor } from './format-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe()); // 全局启用validatePipe
  app.useGlobalInterceptors(new FormatResponseInterceptor());
  const configuration = app.get(ConfigService);
  await app.listen(configuration.get('nest_server_port'));
}
bootstrap();
