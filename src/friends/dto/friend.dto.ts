import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Jogador alvo, pelo apelido. */
export class NicknameDto {
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,16}$/, { message: 'Apelido inválido.' })
  nickname: string;
}
