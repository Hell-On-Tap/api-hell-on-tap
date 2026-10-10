import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CLAN_PERMISSIONS,
  type ClanPermission,
  JOIN_POLICIES,
  type JoinPolicy,
} from '../permissions';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const TAG = /^[A-Za-z0-9]{2,5}$/;
const TAG_MSG = 'A tag deve ter de 2 a 5 letras ou números.';
const POLICY_MSG = 'Escolha a forma de entrada: invite, request ou open.';

export class CreateClanDto {
  @Transform(trim)
  @IsString()
  @Length(3, 32, { message: 'O nome do clã deve ter de 3 a 32 caracteres.' })
  name: string;

  @Transform(trim)
  @IsString()
  @Matches(TAG, { message: TAG_MSG })
  tag: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'A descrição pode ter no máximo 500 caracteres.' })
  description?: string;

  @IsOptional()
  @IsIn(JOIN_POLICIES, { message: POLICY_MSG })
  joinPolicy?: JoinPolicy;
}

/** Fundos prontos (mesmos ids do front), cor #rrggbb ou gradiente grad:<0-359>:#de:#para. Vazio = padrão. */
export const CLAN_BACKGROUND =
  /^$|^(inferno|brasa)$|^#[0-9a-fA-F]{6}$|^grad:(3[0-5]\d|[12]?\d?\d):#[0-9a-fA-F]{6}:#[0-9a-fA-F]{6}$/;

export class UpdateClanDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(3, 32, { message: 'O nome do clã deve ter de 3 a 32 caracteres.' })
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(TAG, { message: TAG_MSG })
  tag?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'A descrição pode ter no máximo 500 caracteres.' })
  description?: string;

  @IsOptional()
  @IsIn(JOIN_POLICIES, { message: POLICY_MSG })
  joinPolicy?: JoinPolicy;

  /** Cor de fundo do clã. Texto vazio volta ao padrão. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(CLAN_BACKGROUND, {
    message: 'Fundo inválido. Use uma cor #rrggbb ou um gradiente.',
  })
  background?: string;

  /** Moldura em volta da logo. */
  @IsOptional()
  @IsBoolean({ message: 'Informe se a logo tem borda ou não.' })
  logoFrame?: boolean;
}

export class InviteDto {
  @Transform(trim)
  @IsString()
  @Length(1, 16, { message: 'Informe o apelido do jogador.' })
  nickname: string;
}

class RoleFields {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 24, { message: 'O nome do cargo deve ter de 1 a 24 caracteres.' })
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Use uma cor no formato #rrggbb.' })
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(CLAN_PERMISSIONS, { each: true, message: 'Permissão desconhecida.' })
  permissions?: ClanPermission[];
}

export class CreateRoleDto extends RoleFields {
  @Transform(trim)
  @IsString()
  @Length(1, 24, { message: 'O nome do cargo deve ter de 1 a 24 caracteres.' })
  declare name: string;
}

export class UpdateRoleDto extends RoleFields {
  /** true torna este o cargo de quem entra no clã */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class MoveRoleDto {
  @IsIn(['up', 'down'], { message: 'Use "up" ou "down".' })
  direction: 'up' | 'down';
}

export class SetMemberRoleDto {
  @IsUUID('4', { message: 'Cargo inválido.' })
  roleId: string;
}

export class TransferDto {
  @IsUUID('4', { message: 'Jogador inválido.' })
  userId: string;
}
