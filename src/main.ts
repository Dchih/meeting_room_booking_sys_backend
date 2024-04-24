import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FormatResponseInterceptor } from './format-response.interceptor';
import { InvokeRecordInterceptor } from './invoke-record.interceptor';
import { UnloginFilter } from './unlogin.filter';
import { CustomExceptionFilter } from './custom-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe()); // 全局启用validatePipe
  app.useGlobalInterceptors(new FormatResponseInterceptor()); // 格式化返回json
  app.useGlobalInterceptors(new InvokeRecordInterceptor()); // 日志
  app.useGlobalFilters(new UnloginFilter()); // 格式化返回错误
  app.useGlobalFilters(new CustomExceptionFilter()); // 针对HttpException的格式化错误

  const config = new DocumentBuilder()
    .setTitle('会议室预定系统')
    .setDescription('api 接口文档')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      description: '基于 jwt 的认证方式',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);

  const configuration = app.get(ConfigService);
  await app.listen(configuration.get('nest_server_port'));
}
bootstrap();
