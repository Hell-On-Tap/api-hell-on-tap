import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import {
  ClansController,
  MyClansController,
  ProfileClansController,
} from './clans.controller';
import { ClansService } from './clans.service';
import { Clan } from './entities/clan.entity';
import { ClanImage } from './entities/clan-image.entity';
import { ClanInvite } from './entities/clan-invite.entity';
import { ClanMember } from './entities/clan-member.entity';
import { ClanRole } from './entities/clan-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clan,
      ClanImage,
      ClanRole,
      ClanMember,
      ClanInvite,
      User,
    ]),
  ],
  controllers: [ClansController, MyClansController, ProfileClansController],
  providers: [ClansService],
})
export class ClansModule {}
