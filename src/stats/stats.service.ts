import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import type { PlayerDeltaDto } from './dto/report.dto';
import {
  PlayerStats,
  STATS_MODES,
  type StatsMode,
} from './player-stats.entity';

export type ModeStats = {
  kills: number;
  deaths: number;
  headshots: number;
  playSeconds: number;
};
const EMPTY: ModeStats = { kills: 0, deaths: 0, headshots: 0, playSeconds: 0 };

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PlayerStats)
    private readonly stats: Repository<PlayerStats>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  /** Soma o que o servidor do jogo mandou. Contas que não existem mais são ignoradas. */
  async report(mode: StatsMode, players: PlayerDeltaDto[]) {
    let saved = 0;
    await this.db.transaction(async (tx) => {
      for (const p of players) {
        if (!p.kills && !p.deaths && !p.headshots && !p.seconds) continue;
        const rows: unknown[] = await tx.query(
          `INSERT INTO player_stats (user_id, mode, kills, deaths, headshots, play_seconds, updated_at)
           SELECT u.id, $2, $3, $4, $5, $6, now() FROM users u WHERE u.id = $1
           ON CONFLICT (user_id, mode) DO UPDATE SET
             kills = player_stats.kills + EXCLUDED.kills,
             deaths = player_stats.deaths + EXCLUDED.deaths,
             headshots = player_stats.headshots + EXCLUDED.headshots,
             play_seconds = player_stats.play_seconds + EXCLUDED.play_seconds,
             updated_at = now()
           RETURNING user_id`,
          [p.userId, mode, p.kills, p.deaths, p.headshots, p.seconds],
        );
        saved += rows.length;
      }
    });
    return { saved };
  }

  /** Estatísticas públicas de um jogador, por modo (zeradas se nunca jogou). */
  async forNickname(nickname: string) {
    const user = await this.users.findOne({
      where: { nicknameKey: nickname.toLowerCase() },
    });
    if (!user) throw new NotFoundException('Jogador não encontrado.');
    const rows = await this.stats.find({ where: { userId: user.id } });
    const modes = Object.fromEntries(
      STATS_MODES.map((mode) => {
        const row = rows.find((r) => r.mode === mode);
        return [
          mode,
          row
            ? {
                kills: row.kills,
                deaths: row.deaths,
                headshots: row.headshots,
                playSeconds: row.playSeconds,
              }
            : EMPTY,
        ];
      }),
    ) as Record<StatsMode, ModeStats>;
    return { modes };
  }

  /** Ranking de um modo: mais abates primeiro. */
  async leaderboard(mode: StatsMode, limit = 50) {
    const rows = await this.stats
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.user', 'u')
      .where('s.mode = :mode', { mode })
      .andWhere('(s.kills > 0 OR s.play_seconds > 0)')
      .orderBy('s.kills', 'DESC')
      .addOrderBy('s.deaths', 'ASC')
      .addOrderBy('s.play_seconds', 'DESC')
      .limit(Math.min(100, Math.max(1, limit)))
      .getMany();
    return {
      mode,
      players: rows.map((r) => ({
        id: r.user.id,
        nickname: r.user.nickname,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUpdatedAt
          ? `/profiles/images/${r.user.id}/avatar?v=${r.user.avatarUpdatedAt.getTime()}`
          : null,
        kills: r.kills,
        deaths: r.deaths,
        headshots: r.headshots,
        playSeconds: r.playSeconds,
      })),
    };
  }
}
