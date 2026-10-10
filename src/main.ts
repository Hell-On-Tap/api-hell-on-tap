import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS_ORIGIN no .env: lista de origens permitidas, separadas por vírgula
  // (ex.: https://hellontap.com,http://localhost:3000).
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

  // 2000: o jogo fica na 2500 e o front na 3000
  await app.listen(process.env.PORT ?? 2000);
}
void bootstrap();
