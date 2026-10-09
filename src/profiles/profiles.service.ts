import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { isReservedNickname } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ImageKind, UserImage } from './user-image.entity';

export const IMAGE_KINDS: ImageKind[] = ['avatar', 'banner'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** O que qualquer pessoa (mesmo sem conta) vê no perfil. */
export type Profile = {
  id: string;
  nickname: string;
  displayName: string | null;
  bio: string | null;
  /** caminho relativo à API, com versão para o cache; null = sem imagem */
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberSince: string;
};

/** Identifica o formato pelos primeiros bytes (não confia no nome nem no tipo enviado). */
function detectImageType(data: Buffer): string | null {
  if (data.length < 12) return null;
  if (data[0] === 0x89 && data.subarray(1, 4).toString('latin1') === 'PNG')
    return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return 'image/jpeg';
  if (data.subarray(0, 6).toString('latin1').startsWith('GIF8'))
    return 'image/gif';
  if (
    data.subarray(0, 4).toString('latin1') === 'RIFF' &&
    data.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserImage) private readonly images: Repository<UserImage>,
  ) {}

  toProfile(user: User): Profile {
    const url = (kind: ImageKind, at: Date | null) =>
      at ? `/profiles/images/${user.id}/${kind}?v=${at.getTime()}` : null;
    return {
      id: user.id,
      nickname: user.nickname,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: url('avatar', user.avatarUpdatedAt),
      bannerUrl: url('banner', user.bannerUpdatedAt),
      memberSince: user.createdAt.toISOString(),
    };
  }

  async byNickname(nickname: string): Promise<Profile> {
    const user = await this.users.findOne({
      where: { nicknameKey: nickname.toLowerCase() },
    });
    if (!user) throw new NotFoundException('Perfil não encontrado.');
    return this.toProfile(user);
  }

  async mine(userId: string) {
    const user = await this.getUser(userId);
    return { ...this.toProfile(user), email: user.email };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const user = await this.getUser(userId);

    if (
      dto.nickname !== undefined &&
      dto.nickname.toLowerCase() !== user.nicknameKey
    ) {
      const key = dto.nickname.toLowerCase();
      if (
        isReservedNickname(key) ||
        (await this.users.exists({ where: { nicknameKey: key } }))
      ) {
        throw new ConflictException('Esse apelido já está em uso.');
      }
      user.nicknameKey = key;
    }
    // mudar só maiúsculas/minúsculas do próprio apelido também vale
    if (dto.nickname !== undefined) user.nickname = dto.nickname;
    if (dto.displayName !== undefined)
      user.displayName = dto.displayName || null;
    if (dto.bio !== undefined) user.bio = dto.bio || null;

    try {
      await this.users.save(user);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Esse apelido já está em uso.');
      }
      throw err;
    }
    return { ...this.toProfile(user), email: user.email };
  }

  async setImage(userId: string, kind: ImageKind, file?: Express.Multer.File) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Envie uma imagem.');
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('A imagem pode ter no máximo 2 MB.');
    }
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException('Envie uma imagem PNG, JPG, WEBP ou GIF.');
    }

    const user = await this.getUser(userId);
    await this.images.save(
      this.images.create({ userId, kind, mimeType, data: file.buffer }),
    );
    user[kind === 'avatar' ? 'avatarUpdatedAt' : 'bannerUpdatedAt'] =
      new Date();
    await this.users.save(user);
    return { ...this.toProfile(user), email: user.email };
  }

  async removeImage(userId: string, kind: ImageKind) {
    const user = await this.getUser(userId);
    await this.images.delete({ userId, kind });
    user[kind === 'avatar' ? 'avatarUpdatedAt' : 'bannerUpdatedAt'] = null;
    await this.users.save(user);
    return { ...this.toProfile(user), email: user.email };
  }

  async image(userId: string, kind: ImageKind) {
    const image = await this.images.findOne({ where: { userId, kind } });
    if (!image) throw new NotFoundException('Imagem não encontrada.');
    return image;
  }

  private async getUser(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Conta não encontrada.');
    return user;
  }
}
