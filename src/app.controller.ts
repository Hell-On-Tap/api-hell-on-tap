import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Configuração pública do site. `gameUrl` vem da variável GAME_URL: o site usa
   * esse endereço para abrir o jogo e listar as salas (sem ela, usa o próprio .env).
   */
  @Get('config')
  config(): { gameUrl: string | null } {
    const url = (process.env.GAME_URL ?? '').trim().replace(/\/+$/, '');
    return { gameUrl: /^https?:\/\//.test(url) ? url : null };
  }
}
