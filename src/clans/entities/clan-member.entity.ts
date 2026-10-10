import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Column,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Clan } from './clan.entity';
import { ClanRole } from './clan-role.entity';

@Entity('clan_members')
export class ClanMember {
  @PrimaryColumn({ name: 'clan_id', type: 'uuid' })
  clanId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Clan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clan_id' })
  clan: Clan;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => ClanRole)
  @JoinColumn({ name: 'role_id' })
  role: ClanRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;
}
