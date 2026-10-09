import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { toPublicUser, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 11;
// Quando o usuário não existe, a senha é comparada com este hash mesmo assim:
// o tempo de resposta fica igual ao de uma senha errada e não revela quais
// apelidos/e-mails estão cadastrados.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash('hell-on-tap', BCRYPT_ROUNDS));

export type JwtPayload = { sub: string; nickname: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.existsByNickname(dto.nickname)) {
      throw new ConflictException('Esse apelido já está em uso.');
    }
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException('Esse e-mail já está cadastrado.');
    }

    let user: User;
    try {
      user = await this.users.create({
        nickname: dto.nickname,
        email: dto.email,
        passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      });
    } catch (err) {
      // dois cadastros iguais ao mesmo tempo: o índice único do banco segura
      if (
        err instanceof QueryFailedError &&
        (err as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Esse apelido ou e-mail já está cadastrado.',
        );
      }
      throw err;
    }
    return this.session(user, false);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findForLogin(dto.login);
    const ok = await compare(
      dto.password,
      user?.passwordHash ?? (await getDummyHash()),
    );
    if (!user || !ok) {
      throw new UnauthorizedException('Apelido, e-mail ou senha incorretos.');
    }
    return this.session(user, dto.remember ?? false);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user)
      throw new UnauthorizedException('Sessão expirada. Entre de novo.');
    return toPublicUser(user);
  }

  private async session(user: User, remember: boolean) {
    const payload: JwtPayload = { sub: user.id, nickname: user.nickname };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: remember ? '30d' : '1d',
    });
    return { accessToken, user: toPublicUser(user) };
  }
}
