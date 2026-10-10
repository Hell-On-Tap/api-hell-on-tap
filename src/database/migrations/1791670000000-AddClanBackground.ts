import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cor de fundo do clã (cor sólida ou gradiente). */
export class AddClanBackground1791670000000 implements MigrationInterface {
  name = 'AddClanBackground1791670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clans" ADD "background" character varying(40)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "clans" DROP COLUMN "background"`);
  }
}
