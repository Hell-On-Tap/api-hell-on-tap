import { MigrationInterface, QueryRunner } from 'typeorm';

/** Amizades (pedido e aceite), bloqueios e "visto por último" (online/offline). */

export class AddFriends1791640000000 implements MigrationInterface {
  name = 'AddFriends1791640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_blocks" ("blocker_id" uuid NOT NULL, "blocked_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_48667515438e7d0f0fed998b193" PRIMARY KEY ("blocker_id", "blocked_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "friendships" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "requester_id" uuid NOT NULL, "addressee_id" uuid NOT NULL, "pair_key" character varying(73) NOT NULL, "status" character varying(8) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "accepted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_6f9d79b3a5687dc3295c5d32bc4" UNIQUE ("pair_key"), CONSTRAINT "PK_08af97d0be72942681757f07bc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_65a5ecb896ed4ad0b8de79d83a" ON "friendships" ("requester_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a5bbd95512887c0824c8ae006" ON "friendships" ("addressee_id", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_seen_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_dfcd8a81016d1de587fbd2d70bf" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_7a0806a54f0ad9ced3e247cacd1" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD CONSTRAINT "FK_4cf3c68ed4a5a9fde8d4c2b7319" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD CONSTRAINT "FK_01b0760fd2402d21f12c6dc5f89" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_01b0760fd2402d21f12c6dc5f89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_4cf3c68ed4a5a9fde8d4c2b7319"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_7a0806a54f0ad9ced3e247cacd1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_dfcd8a81016d1de587fbd2d70bf"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_seen_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a5bbd95512887c0824c8ae006"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_65a5ecb896ed4ad0b8de79d83a"`,
    );
    await queryRunner.query(`DROP TABLE "friendships"`);
    await queryRunner.query(`DROP TABLE "user_blocks"`);
  }
}
