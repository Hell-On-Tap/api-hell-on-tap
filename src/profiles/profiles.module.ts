import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UserImage } from './user-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserImage])],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
