import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Clan } from './clan.entity';

/**
 * Pendências de entrada:
 * - "invite": o clã convidou o jogador (ele aceita ou recusa);
 * - "request": o jogador pediu para entrar (o clã aprova ou recusa).
 * Só existe uma pendência por jogador em cada clã.
 */
@Entity('clan_invites')
@Index(['clanId', 'userId'], { unique: true })
export class ClanInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clan_id', type: 'uuid' })
  clanId: string;

  @ManyToOne(() => Clan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clan_id' })
  clan: Clan;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 8 })
  kind: 'invite' | 'request';

  @Column({ name: 'invited_by_id', type: 'uuid', nullable: true })
  invitedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
