import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Como a pessoa escreveu (aparece no placar e no killfeed). */
  @Column({ length: 16 })
  nickname: string;

  /** Apelido em minúsculas: garante que "Igor" e "igor" não coexistam. */
  @Column({ name: 'nickname_key', length: 16, unique: true })
  nicknameKey: string;

  /** Sempre salvo em minúsculas. */
  @Column({ length: 254, unique: true })
  email: string;

  /** Hash bcrypt; nunca sai do banco a não ser no login. */
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/** Dados do usuário que podem ir para o front. */
export type PublicUser = Pick<User, 'id' | 'nickname' | 'email'>;

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, nickname: user.nickname, email: user.email };
}
