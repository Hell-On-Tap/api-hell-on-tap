import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
}
