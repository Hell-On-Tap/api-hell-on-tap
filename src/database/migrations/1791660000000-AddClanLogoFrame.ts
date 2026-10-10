import { MigrationInterface, QueryRunner } from 'typeorm';

/** Opção de mostrar a logo do clã com ou sem moldura. */
export class AddClanLogoFrame1791660000000 implements MigrationInterface {
  name = 'AddClanLogoFrame1791660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clans" ADD "logo_frame" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "clans" DROP COLUMN "logo_frame"`);
  }
}
