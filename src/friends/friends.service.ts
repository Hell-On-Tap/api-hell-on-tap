import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Friendship, pairKey } from './friendship.entity';
import { UserBlock } from './user-block.entity';

/** Ativo há menos que isso = online. O front avisa a cada minuto. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const MAX_FRIENDS = 200;
export const MAX_OUTGOING = 50;

export type PlayerCard = {
  id: string;
  nickname: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type FriendStatus =
  'self' | 'none' | 'friends' | 'incoming' | 'outgoing' | 'blocked';

export function playerCard(user: User): PlayerCard {
  return {
    id: user.id,
    nickname: user.nickname,
    displayName: user.displayName,
    avatarUrl: user.avatarUpdatedAt
      ? `/profiles/images/${user.id}/avatar?v=${user.avatarUpdatedAt.getTime()}`
      : null,
  };
}

const isOnline = (user: User) =>
  !!user.lastSeenAt &&
  Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS;

@Injectable()
export class FriendsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Friendship)
    private readonly friendships: Repository<Friendship>,
    @InjectRepository(UserBlock) private readonly blocks: Repository<UserBlock>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Marca o jogador como ativo agora (online para os amigos). */
  async heartbeat(userId: string) {
    await this.users.update({ id: userId }, { lastSeenAt: new Date() });
    return { ok: true };
  }

  /** Amigos (online primeiro), pedidos recebidos e enviados, e bloqueados. */
  async list(userId: string) {
    const rows = await this.friendships.find({
      where: [{ requesterId: userId }, { addresseeId: userId }],
      relations: { requester: true, addressee: true },
      order: { createdAt: 'DESC' },
    });
    const other = (f: Friendship) =>
      f.requesterId === userId ? f.addressee : f.requester;

    const friends = rows
      .filter((f) => f.status === 'accepted')
      .map((f) => {
        const u = other(f);
        return {
          ...playerCard(u),
          online: isOnline(u),
          lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
          since: (f.acceptedAt ?? f.createdAt).toISOString(),
        };
      })
      .sort(
        (a, b) =>
          Number(b.online) - Number(a.online) ||
          a.nickname.localeCompare(b.nickname, 'pt-BR', {
            sensitivity: 'base',
          }),
      );

    const pending = (incoming: boolean) =>
      rows
        .filter(
          (f) =>
            f.status === 'pending' &&
            (incoming ? f.addresseeId === userId : f.requesterId === userId),
        )
        .map((f) => ({
          id: f.id,
          player: playerCard(other(f)),
          createdAt: f.createdAt.toISOString(),
        }));

    const blocked = await this.blocks.find({
      where: { blockerId: userId },
      relations: { blocked: true },
      order: { createdAt: 'DESC' },
    });

    return {
      friends,
      incoming: pending(true),
      outgoing: pending(false),
      blocked: blocked.map((b) => playerCard(b.blocked)),
    };
  }

  /** Relação com outro jogador (para o botão do perfil). */
  async status(
    userId: string,
    otherId: string,
  ): Promise<{ status: FriendStatus; requestId?: string }> {
    if (userId === otherId) return { status: 'self' };
    if (
      await this.blocks.exists({
        where: { blockerId: userId, blockedId: otherId },
      })
    ) {
      return { status: 'blocked' };
    }
    const f = await this.friendships.findOne({
      where: { pairKey: pairKey(userId, otherId) },
    });
    if (!f) return { status: 'none' };
    if (f.status === 'accepted') return { status: 'friends' };
    return {
      status: f.requesterId === userId ? 'outgoing' : 'incoming',
      requestId: f.id,
    };
  }

  /**
   * Envia pedido pelo apelido. Se o outro já tinha pedido, vira amizade na hora.
   * Quem bloqueou você recebe "não encontrado", para o bloqueio não aparecer.
   */
  async request(userId: string, nickname: string) {
    const target = await this.users.findOne({
      where: { nicknameKey: nickname.toLowerCase() },
    });
    if (!target) throw new NotFoundException('Jogador não encontrado.');
    if (target.id === userId) {
      throw new BadRequestException('Você não pode adicionar a si mesmo.');
    }
    const [iBlocked, theyBlocked] = await Promise.all([
      this.blocks.exists({
        where: { blockerId: userId, blockedId: target.id },
      }),
      this.blocks.exists({
        where: { blockerId: target.id, blockedId: userId },
      }),
    ]);
    if (iBlocked) {
      throw new ConflictException(
        'Você bloqueou esse jogador. Desbloqueie para enviar o pedido.',
      );
    }
    if (theyBlocked) throw new NotFoundException('Jogador não encontrado.');

    const existing = await this.friendships.findOne({
      where: { pairKey: pairKey(userId, target.id) },
    });
    if (existing?.status === 'accepted') {
      throw new ConflictException('Vocês já são amigos.');
    }
    if (existing && existing.requesterId === userId) {
      throw new ConflictException('Pedido já enviado.');
    }
    if (existing) return this.accept(userId, existing.id);

    const [friends, outgoing] = await Promise.all([
      this.countFriends(userId),
      this.friendships.count({
        where: { requesterId: userId, status: 'pending' },
      }),
    ]);
    if (friends >= MAX_FRIENDS) {
      throw new ConflictException(
        `Você já tem ${MAX_FRIENDS} amigos, o máximo.`,
      );
    }
    if (outgoing >= MAX_OUTGOING) {
      throw new ConflictException(
        'Muitos pedidos esperando resposta. Cancele alguns antes de enviar outros.',
      );
    }

    try {
      await this.friendships.insert({
        requesterId: userId,
        addresseeId: target.id,
        pairKey: pairKey(userId, target.id),
        status: 'pending',
      });
    } catch (err) {
      // o outro mandou um pedido ao mesmo tempo
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Já existe um pedido entre vocês.');
      }
      throw err;
    }
    return this.status(userId, target.id);
  }

  async accept(userId: string, requestId: string) {
    const f = await this.pendingFor(requestId);
    if (f.addresseeId !== userId) {
      throw new ForbiddenException('Só quem recebeu o pedido pode aceitar.');
    }
    if ((await this.countFriends(userId)) >= MAX_FRIENDS) {
      throw new ConflictException(
        `Você já tem ${MAX_FRIENDS} amigos, o máximo.`,
      );
    }
    await this.friendships.update(
      { id: f.id },
      { status: 'accepted', acceptedAt: new Date() },
    );
    return this.status(userId, f.requesterId);
  }

  /** Recusa (quem recebeu) ou cancela (quem enviou) um pedido. */
  async dismiss(userId: string, requestId: string) {
    const f = await this.pendingFor(requestId);
    if (f.addresseeId !== userId && f.requesterId !== userId) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    await this.friendships.delete({ id: f.id });
    return { ok: true };
  }

  async unfriend(userId: string, otherId: string) {
    const res = await this.friendships.delete({
      pairKey: pairKey(userId, otherId),
      status: 'accepted',
    });
    if (!res.affected) throw new NotFoundException('Vocês não são amigos.');
    return { ok: true };
  }

  /** Bloqueia: desfaz amizade e pedidos e impede novos, nos dois sentidos. */
  async block(userId: string, nickname: string) {
    const target = await this.users.findOne({
      where: { nicknameKey: nickname.toLowerCase() },
    });
    if (!target) throw new NotFoundException('Jogador não encontrado.');
    if (target.id === userId) {
      throw new BadRequestException('Você não pode bloquear a si mesmo.');
    }
    await this.db.transaction(async (em) => {
      await em.delete(Friendship, { pairKey: pairKey(userId, target.id) });
      await em
        .createQueryBuilder()
        .insert()
        .into(UserBlock)
        .values({ blockerId: userId, blockedId: target.id })
        .orIgnore()
        .execute();
    });
    return { status: 'blocked' as const };
  }

  async unblock(userId: string, otherId: string) {
    const res = await this.blocks.delete({
      blockerId: userId,
      blockedId: otherId,
    });
    if (!res.affected) {
      throw new NotFoundException('Esse jogador não está bloqueado.');
    }
    return { ok: true };
  }

  private countFriends(userId: string) {
    return this.friendships.count({
      where: [
        { requesterId: userId, status: 'accepted' },
        { addresseeId: userId, status: 'accepted' },
      ],
    });
  }

  private async pendingFor(requestId: string) {
    const f = await this.friendships.findOne({ where: { id: requestId } });
    if (!f || f.status !== 'pending') {
      throw new NotFoundException('Pedido não encontrado.');
    }
    return f;
  }
}
