import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ClanPermission } from '../permissions';
import { Clan } from './clan.entity';

/**
 * Cargo personalizado do clã. "position" é a hierarquia: 0 é o topo.
 * Quem gerencia cargos só mexe em cargos com position maior que a do seu.
 */
@Entity('clan_roles')
@Index(['clanId', 'name'], { unique: true })
export class ClanRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clan_id', type: 'uuid' })
  clanId: string;

  @ManyToOne(() => Clan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clan_id' })
  clan: Clan;

  @Column({ length: 24 })
  name: string;

  /** Cor no formato #rrggbb. */
  @Column({ length: 7, default: '#ffb43a' })
  color: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions: ClanPermission[];

  @Column({ type: 'int' })
  position: number;

  /** Cargo dado a quem entra no clã (sempre existe exatamente um). */
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;
}
