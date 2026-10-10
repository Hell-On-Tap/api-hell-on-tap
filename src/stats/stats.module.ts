import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { PlayerStats } from './player-stats.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerStats, User])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
