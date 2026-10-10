import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PROFILE_SECTIONS } from '../profile-layout';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Campos enviados ficam; os omitidos não mudam. Texto vazio apaga nome/descrição. */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,16}$/, {
    message:
      'O apelido deve ter de 3 a 16 caracteres: letras, números, _ ou -.',
  })
  nickname?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32, { message: 'O nome pode ter no máximo 32 caracteres.' })
  displayName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300, { message: 'A descrição pode ter no máximo 300 caracteres.' })
  bio?: string;

  /** Moldura em volta da foto do perfil. */
  @IsOptional()
  @IsBoolean({ message: 'Informe se a foto tem moldura ou não.' })
  avatarFrame?: boolean;

  /** Ordem das seções (de cima para baixo) e se cada uma aparece. */
  @IsOptional()
  @IsArray({ message: 'Envie a lista de seções.' })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProfileSectionDto)
  layout?: ProfileSectionDto[];
}

export class ProfileSectionDto {
  @IsIn(PROFILE_SECTIONS, { message: 'Seção do perfil desconhecida.' })
  id: string;

  @IsBoolean({ message: 'Informe se a seção aparece ou não.' })
  visible: boolean;
}
