import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Clan } from './clan.entity';

export type ClanImageKind = 'logo' | 'banner';

/** Logo e banner do clã, no Postgres (mesmo esquema das imagens do perfil). */
@Entity('clan_images')
export class ClanImage {
  @PrimaryColumn({ name: 'clan_id', type: 'uuid' })
  clanId: string;

  @PrimaryColumn({ type: 'varchar', length: 16 })
  kind: ClanImageKind;

  @ManyToOne(() => Clan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clan_id' })
  clan: Clan;

  @Column({ name: 'mime_type', length: 32 })
  mimeType: string;

  @Column({ type: 'bytea' })
  data: Buffer;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
