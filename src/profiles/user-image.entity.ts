import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type ImageKind = 'avatar' | 'banner';

/**
 * Foto e banner do perfil. Ficam no próprio Postgres (a API roda em ambiente
 * serverless, sem disco). Separados da tabela users para não carregar bytes à toa.
 */
@Entity('user_images')
export class UserImage {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 16 })
  kind: ImageKind;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'mime_type', length: 32 })
  mimeType: string;

  @Column({ type: 'bytea' })
  data: Buffer;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
