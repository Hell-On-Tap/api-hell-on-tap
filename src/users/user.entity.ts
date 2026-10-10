import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ProfileSection } from '../profiles/profile-layout';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Apelido como a pessoa escreveu. É também o endereço do perfil (/perfil/<apelido>). */
  @Column({ length: 16 })
  nickname: string;

  /** Apelido em minúsculas: garante que "Igor" e "igor" não coexistam. */
  @Column({ name: 'nickname_key', length: 16, unique: true })
  nicknameKey: string;

  /** Sempre salvo em minúsculas. Nunca aparece no perfil público. */
  @Column({ length: 254, unique: true })
  email: string;

  /** Hash bcrypt; nunca sai do banco a não ser no login. */
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  /** Nome de exibição do perfil (opcional; sem ele, o perfil mostra o apelido). */
  @Column({ name: 'display_name', type: 'varchar', length: 32, nullable: true })
  displayName: string | null;

  /** Descrição do perfil. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  bio: string | null;

  /** Quando a foto/banner mudou por último (versão na URL, para o cache do navegador). */
  @Column({ name: 'avatar_updated_at', type: 'timestamptz', nullable: true })
  avatarUpdatedAt: Date | null;

  @Column({ name: 'banner_updated_at', type: 'timestamptz', nullable: true })
  bannerUpdatedAt: Date | null;

  /** Último sinal de vida do site aberto (amigos veem online/offline). */
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  /** Ordem e visibilidade das seções do perfil. null = ordem padrão. */
  @Column({ name: 'profile_layout', type: 'jsonb', nullable: true })
  profileLayout: ProfileSection[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/** Dados da conta que vão para o próprio usuário (login, /auth/me). */
export type PublicUser = Pick<User, 'id' | 'nickname' | 'email'> & {
  avatarUrl: string | null;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    avatarUrl: user.avatarUpdatedAt
      ? `/profiles/images/${user.id}/avatar?v=${user.avatarUpdatedAt.getTime()}`
      : null,
  };
}
