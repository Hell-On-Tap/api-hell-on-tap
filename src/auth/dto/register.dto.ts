import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Informe um apelido.' })
  @Matches(/^[A-Za-z0-9_-]{3,16}$/, {
    message:
      'O apelido deve ter de 3 a 16 caracteres: letras, números, _ ou -.',
  })
  nickname: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString({ message: 'Informe uma senha.' })
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  // o bcrypt só considera os primeiros 72 bytes
  @MaxLength(72, { message: 'A senha pode ter no máximo 72 caracteres.' })
  password: string;
}
