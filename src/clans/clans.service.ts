import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { detectImageType, MAX_IMAGE_BYTES } from '../profiles/profiles.service';
import { User } from '../users/user.entity';
import {
  CreateClanDto,
  CreateRoleDto,
  UpdateClanDto,
  UpdateRoleDto,
} from './dto/clan.dto';
import { Clan } from './entities/clan.entity';
import { ClanImage, ClanImageKind } from './entities/clan-image.entity';
import { ClanInvite } from './entities/clan-invite.entity';
import { ClanMember } from './entities/clan-member.entity';
import { ClanRole } from './entities/clan-role.entity';
import { CLAN_PERMISSIONS, ClanPermission } from './permissions';

/** Quem está agindo no clã, com cargo, permissões e posição na hierarquia. */
type Actor = {
  clan: Clan;
  userId: string;
  isOwner: boolean;
  member: ClanMember | null;
  role: ClanRole | null;
  /** -1 = dono (acima de todos); senão a posição do cargo (0 = topo) */
  rank: number;
  perms: Set<ClanPermission>;
};

const NO_PERMISSION = 'Você não tem permissão para isso.';
const isUniqueViolation = (err: unknown) =>
  err instanceof QueryFailedError &&
  (err as { code?: string }).code === '23505';

@Injectable()
export class ClansService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Clan) private readonly clans: Repository<Clan>,
    @InjectRepository(ClanRole) private readonly roles: Repository<ClanRole>,
    @InjectRepository(ClanMember)
    private readonly members: Repository<ClanMember>,
    @InjectRepository(ClanInvite)
    private readonly invites: Repository<ClanInvite>,
    @InjectRepository(ClanImage) private readonly images: Repository<ClanImage>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // ---------------------------------------------------------------------------
  // Formatos de resposta
  // ---------------------------------------------------------------------------

  private imageUrl(clan: Clan, kind: ClanImageKind) {
    const at = kind === 'logo' ? clan.logoUpdatedAt : clan.bannerUpdatedAt;
    return at ? `/clans/images/${clan.id}/${kind}?v=${at.getTime()}` : null;
  }

  private summary(clan: Clan, memberCount: number) {
    return {
      id: clan.id,
      tag: clan.tag,
      name: clan.name,
      joinPolicy: clan.joinPolicy,
      logoUrl: this.imageUrl(clan, 'logo'),
      logoFrame: clan.logoFrame,
      background: clan.background,
      memberCount,
    };
  }

  private roleView(role: ClanRole) {
    return {
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      isDefault: role.isDefault,
      permissions: role.permissions,
    };
  }

  // ---------------------------------------------------------------------------
  // Leitura pública
  // ---------------------------------------------------------------------------

  async findByTag(tag: string) {
    const clan = await this.clans.findOne({
      where: { tagKey: tag.toLowerCase() },
    });
    if (!clan) throw new NotFoundException('Clã não encontrado.');
    return clan;
  }

  /** Página pública do clã: dados, cargos e membros. */
  async publicView(tag: string) {
    const clan = await this.findByTag(tag);
    const [roles, members] = await Promise.all([
      this.roles.find({
        where: { clanId: clan.id },
        order: { position: 'ASC' },
      }),
      this.members.find({
        where: { clanId: clan.id },
        relations: { user: true },
        order: { joinedAt: 'ASC' },
      }),
    ]);
    return {
      ...this.summary(clan, members.length),
      description: clan.description,
      bannerUrl: this.imageUrl(clan, 'banner'),
      createdAt: clan.createdAt.toISOString(),
      ownerId: clan.ownerId,
      roles: roles.map((r) => this.roleView(r)),
      members: members.map((m) => ({
        userId: m.userId,
        nickname: m.user.nickname,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUpdatedAt
          ? `/profiles/images/${m.userId}/avatar?v=${m.user.avatarUpdatedAt.getTime()}`
          : null,
        roleId: m.roleId,
        isOwner: m.userId === clan.ownerId,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  /** Busca de clãs (por nome ou tag), os maiores primeiro. */
  async search(term = '', limit = 24) {
    const qb = this.clans
      .createQueryBuilder('c')
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(ClanMember, 'm')
            .where('m.clan_id = c.id'),
        'member_count',
      )
      .orderBy('member_count', 'DESC')
      .addOrderBy('c.created_at', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 50));
    const q = term.trim().toLowerCase();
    if (q)
      qb.where('(c.tag_key LIKE :q OR LOWER(c.name) LIKE :q)', {
        q: `%${q.replace(/[%_\\]/g, '\\$&')}%`,
      });
    const { raw, entities } = await qb.getRawAndEntities<{
      member_count: string;
    }>();
    return entities.map((clan, i) =>
      this.summary(clan, Number(raw[i].member_count)),
    );
  }

  /** Clãs de um jogador (perfil público). */
  async clansOf(userId: string) {
    const rows = await this.members.find({
      where: { userId },
      relations: { clan: true, role: true },
      order: { joinedAt: 'ASC' },
    });
    const counts = await this.memberCounts(rows.map((r) => r.clanId));
    return rows.map((r) => ({
      ...this.summary(r.clan, counts.get(r.clanId) ?? 0),
      role: { name: r.role.name, color: r.role.color },
      isOwner: r.clan.ownerId === userId,
    }));
  }

  async clansOfNickname(nickname: string) {
    const user = await this.users.findOne({
      where: { nicknameKey: nickname.toLowerCase() },
    });
    if (!user) throw new NotFoundException('Perfil não encontrado.');
    return this.clansOf(user.id);
  }

  private async memberCounts(clanIds: string[]) {
    if (!clanIds.length) return new Map<string, number>();
    const rows = await this.members
      .createQueryBuilder('m')
      .select('m.clan_id', 'clanId')
      .addSelect('COUNT(*)', 'count')
      .where('m.clan_id IN (:...clanIds)', { clanIds })
      .groupBy('m.clan_id')
      .getRawMany<{ clanId: string; count: string }>();
    return new Map(rows.map((r) => [r.clanId, Number(r.count)]));
  }

  async image(clanId: string, kind: ClanImageKind) {
    const image = await this.images.findOne({ where: { clanId, kind } });
    if (!image) throw new NotFoundException('Imagem não encontrada.');
    return image;
  }

  // ---------------------------------------------------------------------------
  // Permissões e hierarquia
  // ---------------------------------------------------------------------------

  private async actor(tag: string, userId: string): Promise<Actor> {
    const clan = await this.findByTag(tag);
    const member = await this.members.findOne({
      where: { clanId: clan.id, userId },
      relations: { role: true },
    });
    const isOwner = clan.ownerId === userId;
    return {
      clan,
      userId,
      isOwner,
      member,
      role: member?.role ?? null,
      rank: isOwner ? -1 : (member?.role.position ?? Number.POSITIVE_INFINITY),
      perms: new Set(
        isOwner ? CLAN_PERMISSIONS : (member?.role.permissions ?? []),
      ),
    };
  }

  private require(actor: Actor, perm: ClanPermission) {
    if (!actor.perms.has(perm)) throw new ForbiddenException(NO_PERMISSION);
  }

  /** O cargo está abaixo do cargo de quem age? (o dono alcança todos) */
  private canManageRole(actor: Actor, role: ClanRole) {
    return actor.isOwner || actor.rank < role.position;
  }

  /** O membro está abaixo de quem age? Ninguém age sobre o dono. */
  private canManageMember(
    actor: Actor,
    target: ClanMember & { role: ClanRole },
  ) {
    if (target.userId === actor.clan.ownerId) return false;
    return actor.isOwner || actor.rank < target.role.position;
  }

  /** O que o jogador logado pode fazer neste clã (a tela de gestão usa isto). */
  async viewer(tag: string, userId: string) {
    const actor = await this.actor(tag, userId);
    const pending = await this.invites.findOne({
      where: { clanId: actor.clan.id, userId },
    });
    return {
      isMember: !!actor.member,
      isOwner: actor.isOwner,
      roleId: actor.role?.id ?? null,
      rank: actor.member ? actor.rank : null,
      permissions: [...actor.perms],
      pending: pending ? { id: pending.id, kind: pending.kind } : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Criar, editar e apagar o clã
  // ---------------------------------------------------------------------------

  async create(userId: string, dto: CreateClanDto) {
    if (await this.clans.exists({ where: { tagKey: dto.tag.toLowerCase() } })) {
      throw new ConflictException('Essa tag já está em uso.');
    }
    try {
      const clan = await this.db.transaction(async (em) => {
        const created = await em.save(
          em.create(Clan, {
            name: dto.name,
            tag: dto.tag,
            tagKey: dto.tag.toLowerCase(),
            description: dto.description || null,
            joinPolicy: dto.joinPolicy ?? 'invite',
            ownerId: userId,
          }),
        );
        // cargos iniciais: Líder (tudo) e Membro (padrão, sem permissões)
        const leader = await em.save(
          em.create(ClanRole, {
            clanId: created.id,
            name: 'Líder',
            color: '#ff5a1f',
            permissions: [...CLAN_PERMISSIONS],
            position: 0,
          }),
        );
        await em.save(
          em.create(ClanRole, {
            clanId: created.id,
            name: 'Membro',
            color: '#ffb43a',
            permissions: [],
            position: 1,
            isDefault: true,
          }),
        );
        await em.save(
          em.create(ClanMember, {
            clanId: created.id,
            userId,
            roleId: leader.id,
          }),
        );
        return created;
      });
      return this.publicView(clan.tag);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Essa tag já está em uso.');
      throw err;
    }
  }

  async update(tag: string, userId: string, dto: UpdateClanDto) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'edit_clan');
    const clan = actor.clan;
    if (dto.tag !== undefined && dto.tag.toLowerCase() !== clan.tagKey) {
      if (
        await this.clans.exists({ where: { tagKey: dto.tag.toLowerCase() } })
      ) {
        throw new ConflictException('Essa tag já está em uso.');
      }
      clan.tagKey = dto.tag.toLowerCase();
    }
    if (dto.tag !== undefined) clan.tag = dto.tag;
    if (dto.name !== undefined) clan.name = dto.name;
    if (dto.description !== undefined)
      clan.description = dto.description || null;
    if (dto.joinPolicy !== undefined) clan.joinPolicy = dto.joinPolicy;
    if (dto.logoFrame !== undefined) clan.logoFrame = dto.logoFrame;
    if (dto.background !== undefined)
      clan.background = dto.background ? dto.background.toLowerCase() : null;
    try {
      await this.clans.save(clan);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Essa tag já está em uso.');
      throw err;
    }
    return this.publicView(clan.tag);
  }

  async remove(tag: string, userId: string) {
    const actor = await this.actor(tag, userId);
    if (!actor.isOwner)
      throw new ForbiddenException('Só o dono pode apagar o clã.');
    await this.db.transaction(async (em) => {
      // membros primeiro: eles apontam para os cargos
      await em.delete(ClanMember, { clanId: actor.clan.id });
      await em.delete(Clan, { id: actor.clan.id });
    });
    return { deleted: true };
  }

  async setImage(
    tag: string,
    userId: string,
    kind: ClanImageKind,
    file?: Express.Multer.File,
  ) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'edit_clan');
    if (!file?.buffer?.length)
      throw new BadRequestException('Envie uma imagem.');
    if (file.size > MAX_IMAGE_BYTES)
      throw new BadRequestException('A imagem pode ter no máximo 2 MB.');
    const mimeType = detectImageType(file.buffer);
    if (!mimeType)
      throw new BadRequestException('Envie uma imagem PNG, JPG, WEBP ou GIF.');
    const clan = actor.clan;
    await this.images.save(
      this.images.create({
        clanId: clan.id,
        kind,
        mimeType,
        data: file.buffer,
      }),
    );
    clan[kind === 'logo' ? 'logoUpdatedAt' : 'bannerUpdatedAt'] = new Date();
    await this.clans.save(clan);
    return this.publicView(clan.tag);
  }

  async removeImage(tag: string, userId: string, kind: ClanImageKind) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'edit_clan');
    const clan = actor.clan;
    await this.images.delete({ clanId: clan.id, kind });
    clan[kind === 'logo' ? 'logoUpdatedAt' : 'bannerUpdatedAt'] = null;
    await this.clans.save(clan);
    return this.publicView(clan.tag);
  }

  /** Passa a liderança: o novo dono também recebe o cargo do topo. */
  async transfer(tag: string, userId: string, newOwnerId: string) {
    const actor = await this.actor(tag, userId);
    if (!actor.isOwner)
      throw new ForbiddenException('Só o dono pode transferir a liderança.');
    if (newOwnerId === userId)
      throw new BadRequestException('Você já é o dono.');
    const target = await this.members.findOne({
      where: { clanId: actor.clan.id, userId: newOwnerId },
    });
    if (!target) throw new NotFoundException('Esse jogador não está no clã.');
    const top = await this.roles.findOne({
      where: { clanId: actor.clan.id },
      order: { position: 'ASC' },
    });
    await this.db.transaction(async (em) => {
      await em.update(Clan, { id: actor.clan.id }, { ownerId: newOwnerId });
      if (top)
        await em.update(
          ClanMember,
          { clanId: actor.clan.id, userId: newOwnerId },
          { roleId: top.id },
        );
    });
    return this.publicView(actor.clan.tag);
  }

  // ---------------------------------------------------------------------------
  // Entrada: convites, pedidos e clãs abertos
  // ---------------------------------------------------------------------------

  private async addMember(em: EntityManager, clanId: string, userId: string) {
    const role = await em.findOne(ClanRole, {
      where: { clanId, isDefault: true },
    });
    if (!role) throw new ConflictException('O clã está sem cargo padrão.');
    await em.delete(ClanInvite, { clanId, userId });
    await em.save(em.create(ClanMember, { clanId, userId, roleId: role.id }));
  }

  private async join(clanId: string, userId: string) {
    try {
      await this.db.transaction((em) => this.addMember(em, clanId, userId));
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Esse jogador já está no clã.');
      throw err;
    }
  }

  /** Convidar pelo apelido. Se o jogador já tinha pedido para entrar, entra direto. */
  async invite(tag: string, userId: string, nickname: string) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'invite');
    const target = await this.users.findOne({
      where: { nicknameKey: nickname.toLowerCase() },
    });
    if (!target)
      throw new NotFoundException('Nenhum jogador com esse apelido.');
    const clanId = actor.clan.id;
    if (await this.members.exists({ where: { clanId, userId: target.id } })) {
      throw new ConflictException('Esse jogador já está no clã.');
    }
    const pending = await this.invites.findOne({
      where: { clanId, userId: target.id },
    });
    if (pending?.kind === 'invite')
      throw new ConflictException('Esse jogador já foi convidado.');
    if (pending?.kind === 'request') {
      await this.join(clanId, target.id);
      return { status: 'joined' as const };
    }
    try {
      await this.invites.save(
        this.invites.create({
          clanId,
          userId: target.id,
          kind: 'invite',
          invitedById: userId,
        }),
      );
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Esse jogador já foi convidado.');
      throw err;
    }
    return { status: 'invited' as const };
  }

  /** Pendências do clã: convites enviados (quem pode convidar) e pedidos (quem pode aprovar). */
  async pending(tag: string, userId: string) {
    const actor = await this.actor(tag, userId);
    const kinds = [
      ...(actor.perms.has('invite') ? ['invite' as const] : []),
      ...(actor.perms.has('approve') ? ['request' as const] : []),
    ];
    if (!kinds.length) throw new ForbiddenException(NO_PERMISSION);
    const rows = await this.invites.find({
      where: { clanId: actor.clan.id, kind: In(kinds) },
      relations: { user: true, invitedBy: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      createdAt: r.createdAt.toISOString(),
      user: { id: r.userId, nickname: r.user.nickname },
      invitedBy: r.invitedBy ? r.invitedBy.nickname : null,
    }));
  }

  /** Cancela convite (quem convida) ou recusa pedido (quem aprova). */
  async cancelPending(tag: string, userId: string, inviteId: string) {
    const actor = await this.actor(tag, userId);
    const row = await this.invites.findOne({
      where: { id: inviteId, clanId: actor.clan.id },
    });
    if (!row) throw new NotFoundException('Convite ou pedido não encontrado.');
    this.require(actor, row.kind === 'invite' ? 'invite' : 'approve');
    await this.invites.delete({ id: row.id });
    return { removed: true };
  }

  async approve(tag: string, userId: string, requestId: string) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'approve');
    const row = await this.invites.findOne({
      where: { id: requestId, clanId: actor.clan.id, kind: 'request' },
    });
    if (!row) throw new NotFoundException('Pedido não encontrado.');
    await this.join(actor.clan.id, row.userId);
    return { status: 'joined' as const };
  }

  /** Botão "Entrar" na página do clã: o resultado depende da forma de entrada do clã. */
  async requestJoin(tag: string, userId: string) {
    const clan = await this.findByTag(tag);
    if (await this.members.exists({ where: { clanId: clan.id, userId } })) {
      throw new ConflictException('Você já está neste clã.');
    }
    const pending = await this.invites.findOne({
      where: { clanId: clan.id, userId },
    });
    // convidado sempre pode aceitar, qualquer que seja a forma de entrada
    if (pending?.kind === 'invite' || clan.joinPolicy === 'open') {
      await this.join(clan.id, userId);
      return { status: 'joined' as const };
    }
    if (clan.joinPolicy === 'invite') {
      throw new ForbiddenException('Este clã aceita jogadores só por convite.');
    }
    if (pending?.kind === 'request')
      throw new ConflictException('Você já pediu para entrar.');
    try {
      await this.invites.save(
        this.invites.create({ clanId: clan.id, userId, kind: 'request' }),
      );
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Você já pediu para entrar.');
      throw err;
    }
    return { status: 'requested' as const };
  }

  /** Convites recebidos pelo jogador logado. */
  async myInvites(userId: string) {
    const rows = await this.invites.find({
      where: { userId, kind: 'invite' },
      relations: { clan: true, invitedBy: true },
      order: { createdAt: 'DESC' },
    });
    const counts = await this.memberCounts(rows.map((r) => r.clanId));
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      invitedBy: r.invitedBy ? r.invitedBy.nickname : null,
      clan: this.summary(r.clan, counts.get(r.clanId) ?? 0),
    }));
  }

  async acceptInvite(userId: string, inviteId: string) {
    const row = await this.invites.findOne({
      where: { id: inviteId, userId, kind: 'invite' },
      relations: { clan: true },
    });
    if (!row) throw new NotFoundException('Convite não encontrado.');
    await this.join(row.clanId, userId);
    return { status: 'joined' as const, tag: row.clan.tag };
  }

  /** Recusa um convite recebido ou desiste de um pedido feito. */
  async declineInvite(userId: string, inviteId: string) {
    const row = await this.invites.findOne({ where: { id: inviteId, userId } });
    if (!row) throw new NotFoundException('Convite não encontrado.');
    await this.invites.delete({ id: row.id });
    return { removed: true };
  }

  async leave(tag: string, userId: string) {
    const actor = await this.actor(tag, userId);
    if (!actor.member)
      throw new BadRequestException('Você não está neste clã.');
    if (actor.isOwner) {
      throw new BadRequestException(
        'Passe a liderança para outro membro ou apague o clã antes de sair.',
      );
    }
    await this.members.delete({ clanId: actor.clan.id, userId });
    return { left: true };
  }

  // ---------------------------------------------------------------------------
  // Membros
  // ---------------------------------------------------------------------------

  private async targetMember(clanId: string, userId: string) {
    const target = await this.members.findOne({
      where: { clanId, userId },
      relations: { role: true },
    });
    if (!target) throw new NotFoundException('Esse jogador não está no clã.');
    return target;
  }

  async kick(tag: string, userId: string, targetId: string) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'kick');
    if (targetId === userId)
      throw new BadRequestException('Para sair do clã, use "Sair".');
    const target = await this.targetMember(actor.clan.id, targetId);
    if (!this.canManageMember(actor, target)) {
      throw new ForbiddenException(
        'Você só pode expulsar membros de cargos abaixo do seu.',
      );
    }
    await this.members.delete({ clanId: actor.clan.id, userId: targetId });
    return { kicked: true };
  }

  async setMemberRole(
    tag: string,
    userId: string,
    targetId: string,
    roleId: string,
  ) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'manage_roles');
    const target = await this.targetMember(actor.clan.id, targetId);
    const role = await this.roles.findOne({
      where: { id: roleId, clanId: actor.clan.id },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado.');
    // o dono pode trocar o próprio cargo; os demais só mexem abaixo de si
    const selfOwner = actor.isOwner && targetId === userId;
    if (!selfOwner && !this.canManageMember(actor, target)) {
      throw new ForbiddenException(
        'Você só pode mudar o cargo de membros abaixo do seu.',
      );
    }
    if (!this.canManageRole(actor, role)) {
      throw new ForbiddenException('Você só pode dar cargos abaixo do seu.');
    }
    await this.members.update(
      { clanId: actor.clan.id, userId: targetId },
      { roleId: role.id },
    );
    return this.publicView(actor.clan.tag);
  }

  // ---------------------------------------------------------------------------
  // Cargos
  // ---------------------------------------------------------------------------

  /** Ninguém (exceto o dono) dá a um cargo permissões que não tem. */
  private checkGrant(actor: Actor, perms: ClanPermission[] | undefined) {
    if (!perms || actor.isOwner) return;
    const missing = perms.filter((p) => !actor.perms.has(p));
    if (missing.length) {
      throw new ForbiddenException(
        'Você não pode dar a um cargo permissões que você não tem.',
      );
    }
  }

  private async roleOf(actor: Actor, roleId: string) {
    const role = await this.roles.findOne({
      where: { id: roleId, clanId: actor.clan.id },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado.');
    if (!this.canManageRole(actor, role)) {
      throw new ForbiddenException(
        'Você só pode mexer em cargos abaixo do seu.',
      );
    }
    return role;
  }

  private async ensureNameFree(
    clanId: string,
    name: string,
    exceptId?: string,
  ) {
    const same = await this.roles
      .createQueryBuilder('r')
      .where('r.clan_id = :clanId AND LOWER(r.name) = LOWER(:name)', {
        clanId,
        name,
      })
      .getOne();
    if (same && same.id !== exceptId)
      throw new ConflictException('Já existe um cargo com esse nome.');
  }

  /** Cargo novo entra logo abaixo do cargo de quem criou (o dono: abaixo do topo). */
  async createRole(tag: string, userId: string, dto: CreateRoleDto) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'manage_roles');
    this.checkGrant(actor, dto.permissions);
    await this.ensureNameFree(actor.clan.id, dto.name);
    const insertAt = actor.isOwner ? 1 : actor.rank + 1;
    await this.db.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .update(ClanRole)
        .set({ position: () => 'position + 1' })
        .where('clan_id = :clanId AND position >= :insertAt', {
          clanId: actor.clan.id,
          insertAt,
        })
        .execute();
      await em.save(
        em.create(ClanRole, {
          clanId: actor.clan.id,
          name: dto.name,
          color: dto.color ?? '#ffb43a',
          permissions: dto.permissions ?? [],
          position: insertAt,
        }),
      );
    });
    return this.publicView(actor.clan.tag);
  }

  async updateRole(
    tag: string,
    userId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'manage_roles');
    const role = await this.roleOf(actor, roleId);
    this.checkGrant(actor, dto.permissions);
    if (dto.name !== undefined) {
      await this.ensureNameFree(actor.clan.id, dto.name, role.id);
      role.name = dto.name;
    }
    if (dto.color !== undefined) role.color = dto.color;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;
    await this.db.transaction(async (em) => {
      if (dto.isDefault === true && !role.isDefault) {
        await em.update(
          ClanRole,
          { clanId: actor.clan.id },
          { isDefault: false },
        );
        role.isDefault = true;
      }
      await em.save(role);
    });
    return this.publicView(actor.clan.tag);
  }

  /** Sobe ou desce o cargo uma posição (troca com o vizinho). */
  async moveRole(
    tag: string,
    userId: string,
    roleId: string,
    direction: 'up' | 'down',
  ) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'manage_roles');
    const role = await this.roleOf(actor, roleId);
    const all = await this.roles.find({
      where: { clanId: actor.clan.id },
      order: { position: 'ASC' },
    });
    const i = all.findIndex((r) => r.id === role.id);
    const neighbor = all[direction === 'up' ? i - 1 : i + 1];
    if (!neighbor) return this.publicView(actor.clan.tag);
    // não dá para subir acima (ou ao lado) do próprio cargo
    if (!this.canManageRole(actor, neighbor)) {
      throw new ForbiddenException(
        'Você não pode colocar um cargo acima do seu.',
      );
    }
    await this.db.transaction(async (em) => {
      await em.update(
        ClanRole,
        { id: role.id },
        { position: neighbor.position },
      );
      await em.update(
        ClanRole,
        { id: neighbor.id },
        { position: role.position },
      );
    });
    return this.publicView(actor.clan.tag);
  }

  /** Apaga o cargo; quem tinha ele passa para o cargo padrão. */
  async removeRole(tag: string, userId: string, roleId: string) {
    const actor = await this.actor(tag, userId);
    this.require(actor, 'manage_roles');
    const role = await this.roleOf(actor, roleId);
    if (role.isDefault) {
      throw new BadRequestException(
        'Escolha outro cargo padrão antes de apagar este.',
      );
    }
    const fallback = await this.roles.findOne({
      where: { clanId: actor.clan.id, isDefault: true },
    });
    if (!fallback) throw new ConflictException('O clã está sem cargo padrão.');
    await this.db.transaction(async (em) => {
      await em.update(
        ClanMember,
        { clanId: actor.clan.id, roleId: role.id },
        { roleId: fallback.id },
      );
      await em.delete(ClanRole, { id: role.id });
      await em
        .createQueryBuilder()
        .update(ClanRole)
        .set({ position: () => 'position - 1' })
        .where('clan_id = :clanId AND position > :pos', {
          clanId: actor.clan.id,
          pos: role.position,
        })
        .execute();
    });
    return this.publicView(actor.clan.tag);
  }

  /** Clãs do jogador logado, com cargo e permissões. */
  async mine(userId: string) {
    const rows = await this.members.find({
      where: { userId },
      relations: { clan: true, role: true },
      order: { joinedAt: 'ASC' },
    });
    const counts = await this.memberCounts(rows.map((r) => r.clanId));
    return rows.map((r) => {
      const isOwner = r.clan.ownerId === userId;
      return {
        ...this.summary(r.clan, counts.get(r.clanId) ?? 0),
        role: { name: r.role.name, color: r.role.color },
        isOwner,
        permissions: isOwner ? [...CLAN_PERMISSIONS] : r.role.permissions,
      };
    });
  }
}
