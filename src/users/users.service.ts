import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  existsByNickname(nickname: string) {
    return this.users.exists({
      where: { nicknameKey: nickname.toLowerCase() },
    });
  }

  existsByEmail(email: string) {
    return this.users.exists({ where: { email: email.toLowerCase() } });
  }

  /** Busca por apelido ou e-mail, trazendo o hash da senha para conferir. */
  findForLogin(login: string) {
    const value = login.trim().toLowerCase();
    const column = value.includes('@') ? 'email' : 'nickname_key';
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where(`user.${column} = :value`, { value })
      .getOne();
  }

  create(data: { nickname: string; email: string; passwordHash: string }) {
    const user = this.users.create({
      nickname: data.nickname,
      nicknameKey: data.nickname.toLowerCase(),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
    });
    return this.users.save(user);
  }
}
