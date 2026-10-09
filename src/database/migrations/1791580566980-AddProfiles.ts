import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfiles1791580566980 implements MigrationInterface {
  name = 'AddProfiles1791580566980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_images" ("user_id" uuid NOT NULL, "kind" character varying(16) NOT NULL, "mime_type" character varying(32) NOT NULL, "data" bytea NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_979d17017f0db99de738f5f934e" PRIMARY KEY ("user_id", "kind"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "display_name" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "bio" character varying(300)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_updated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "banner_updated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_images" ADD CONSTRAINT "FK_1f838530159ac83c30cab951dca" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_images" DROP CONSTRAINT "FK_1f838530159ac83c30cab951dca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "banner_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "avatar_updated_at"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "display_name"`);
    await queryRunner.query(`DROP TABLE "user_images"`);
  }
}
