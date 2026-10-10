import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Só o servidor do jogo manda estatísticas: ele envia a chave GAME_SERVER_KEY
 * (a mesma nos dois .env) no cabeçalho X-Game-Key. Sem chave configurada, ninguém entra.
 */
@Injectable()
export class GameKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.GAME_SERVER_KEY ?? '';
    const given =
      context.switchToHttp().getRequest<Request>().header('x-game-key') ?? '';
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (
      expected.length < 16 ||
      a.length !== b.length ||
      !timingSafeEqual(a, b)
    ) {
      throw new UnauthorizedException('Chave do servidor do jogo inválida.');
    }
    return true;
  }
}
