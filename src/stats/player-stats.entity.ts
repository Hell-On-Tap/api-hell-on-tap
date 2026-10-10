import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/** Modos que contam estatística. Treino com bots não conta (roda só no navegador). */
export const STATS_MODES = ['deathmatch', 'competitive'] as const;
export type StatsMode = (typeof STATS_MODES)[number];

/** Totais de um jogador num modo: abates, mortes, headshots e tempo de jogo de verdade. */
@Entity('player_stats')
export class PlayerStats {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @PrimaryColumn({ type: 'varchar', length: 16 })
  mode: StatsMode;

  @Column({ type: 'integer', default: 0 })
  kills: number;

  @Column({ type: 'integer', default: 0 })
  deaths: number;

  @Column({ type: 'integer', default: 0 })
  headshots: number;

  /** segundos conectado numa partida já começada */
  @Column({ name: 'play_seconds', type: 'integer', default: 0 })
  playSeconds: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
