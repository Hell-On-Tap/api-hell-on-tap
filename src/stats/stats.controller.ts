import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportDto } from './dto/report.dto';
import { GameKeyGuard } from './game-key.guard';
import { STATS_MODES, type StatsMode } from './player-stats.entity';
import { StatsService } from './stats.service';

@Controller()
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  /** Servidor do jogo manda abates, mortes, headshots e tempo de jogo (com a chave). */
  @Post('game/report')
  @HttpCode(200)
  @UseGuards(GameKeyGuard)
  report(@Body() dto: ReportDto) {
    return this.stats.report(dto.mode, dto.players);
  }

  /** Público: estatísticas do perfil, separadas por modo. */
  @Get('profiles/:nickname/stats')
  forProfile(@Param('nickname') nickname: string) {
    return this.stats.forNickname(nickname);
  }

  /** Público: ranking de um modo (padrão: mata-mata). */
  @Get('stats/leaderboard')
  leaderboard(
    @Query('mode') mode = 'deathmatch',
    @Query('limit') limit?: string,
  ) {
    if (!STATS_MODES.includes(mode as StatsMode))
      throw new BadRequestException('Modo inválido.');
    return this.stats.leaderboard(
      mode as StatsMode,
      limit ? Number(limit) || 50 : 50,
    );
  }
}
