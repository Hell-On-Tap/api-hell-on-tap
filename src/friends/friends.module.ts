import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { Friendship } from './friendship.entity';
import { UserBlock } from './user-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, UserBlock, User])],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
