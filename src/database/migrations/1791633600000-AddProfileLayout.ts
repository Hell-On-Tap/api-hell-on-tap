import { MigrationInterface, QueryRunner } from 'typeorm';

/** Ordem e visibilidade das seções do perfil (Clãs, Estatísticas...). */
export class AddProfileLayout1791633600000 implements MigrationInterface {
  name = 'AddProfileLayout1791633600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "profile_layout" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_layout"`);
  }
}
