import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // só o front do Hell on Tap pode chamar a API pelo navegador
  app.enableCors({
    origin: (process.env.FRONT_URL ?? 'http://localhost:3001').split(','),
    credentials: true,
  });

  // valida os DTOs e descarta campos que não foram declarados
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 3333: a porta 3000 é do servidor do jogo e a 3001 do front
  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
