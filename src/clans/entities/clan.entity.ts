import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import type { JoinPolicy } from '../permissions';

@Entity('clans')
export class Clan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32 })
  name: string;

  /** Tag como foi escrita (ex.: HOT). Também é o endereço: /clan/<tag>. */
  @Column({ length: 5 })
  tag: string;

  /** Tag em minúsculas: garante tags únicas sem diferenciar maiúsculas. */
  @Column({ name: 'tag_key', length: 5, unique: true })
  tagKey: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    name: 'join_policy',
    type: 'varchar',
    length: 16,
    default: 'invite',
  })
  joinPolicy: JoinPolicy;

  /** Dono: tem todas as permissões, não pode ser expulso. */
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'logo_updated_at', type: 'timestamptz', nullable: true })
  logoUpdatedAt: Date | null;

  @Column({ name: 'banner_updated_at', type: 'timestamptz', nullable: true })
  bannerUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
