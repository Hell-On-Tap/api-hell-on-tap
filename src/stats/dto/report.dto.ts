import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { STATS_MODES, type StatsMode } from '../player-stats.entity';

/** O que um jogador fez desde o último envio do servidor do jogo. */
export class PlayerDeltaDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(0)
  @Max(10_000)
  kills: number;

  @IsInt()
  @Min(0)
  @Max(10_000)
  deaths: number;

  @IsInt()
  @Min(0)
  @Max(10_000)
  headshots: number;

  /** um envio cobre no máximo um dia de jogo */
  @IsInt()
  @Min(0)
  @Max(86_400)
  seconds: number;
}

export class ReportDto {
  @IsIn(STATS_MODES)
  mode: StatsMode;

  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => PlayerDeltaDto)
  players: PlayerDeltaDto[];
}
