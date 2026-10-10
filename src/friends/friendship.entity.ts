import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type FriendshipStatus = 'pending' | 'accepted';

/**
 * Amizade entre dois jogadores. Começa como pedido ("pending", de requester
 * para addressee) e vira "accepted" quando o outro aceita. Só existe uma
 * linha por par, qualquer que seja quem pediu (pair_key).
 */
@Entity('friendships')
@Index(['addresseeId', 'status'])
@Index(['requesterId', 'status'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'addressee_id', type: 'uuid' })
  addresseeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressee_id' })
  addressee: User;

  /** os dois ids em ordem, separados por ":"; impede pedido duplicado nos dois sentidos */
  @Column({ name: 'pair_key', type: 'varchar', length: 73, unique: true })
  pairKey: string;

  @Column({ type: 'varchar', length: 8 })
  status: FriendshipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;
}

export function pairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
