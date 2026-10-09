import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  /** Apelido ou e-mail. */
  @IsString({ message: 'Informe seu apelido ou e-mail.' })
  @IsNotEmpty({ message: 'Informe seu apelido ou e-mail.' })
  login: string;

  @IsString({ message: 'Informe sua senha.' })
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password: string;

  /** true = sessão de 30 dias; false = 1 dia. */
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
