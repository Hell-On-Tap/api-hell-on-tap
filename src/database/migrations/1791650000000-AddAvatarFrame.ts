import { MigrationInterface, QueryRunner } from 'typeorm';

/** Opção de mostrar a foto do perfil com ou sem moldura. */
export class AddAvatarFrame1791650000000 implements MigrationInterface {
  name = 'AddAvatarFrame1791650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_frame" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_frame"`);
  }
}
