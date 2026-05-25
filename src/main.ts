import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import lodash from 'lodash';
import { urlencoded, json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const options = new DocumentBuilder()
    .setTitle('ShameCollector')
    .setDescription('Service in charge of extracting and processing ransomware victim data.')
    .setVersion('1.0')
    .addTag('Service End Points')
    .build();

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);
  const port = await lodash.get(process.env, ['PORT'], 3000);
  await app.listen(port);
}
bootstrap();
