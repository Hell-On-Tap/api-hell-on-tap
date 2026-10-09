import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS_ORIGIN no .env: lista de origens permitidas, separadas por vírgula
  // (ex.: https://hellontap.com,http://localhost:3001).
  // Sem CORS_ORIGIN, qualquer origem é aceita. Isso equivale ao "*", mas
  // devolvendo a origem de quem chamou, porque o navegador recusa "*" quando a
  // requisição usa credentials.
  const allowed = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowed.length ? allowed : true,
    credentials: true,
  });

  // valida os DTOs e descarta campos que não foram declarados
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 3333: a porta 3000 é do servidor do jogo e a 3001 do front
  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
