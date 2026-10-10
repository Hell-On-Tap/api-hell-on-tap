import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClans1791589132352 implements MigrationInterface {
  name = 'AddClans1791589132352';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "clans" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(32) NOT NULL, "tag" character varying(5) NOT NULL, "tag_key" character varying(5) NOT NULL, "description" character varying(500), "join_policy" character varying(16) NOT NULL DEFAULT 'invite', "owner_id" uuid NOT NULL, "logo_updated_at" TIMESTAMP WITH TIME ZONE, "banner_updated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fceff8a64f2d020e8703e57eed0" UNIQUE ("tag_key"), CONSTRAINT "PK_d198f00cf9d1743a58fc23d420e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "clan_roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clan_id" uuid NOT NULL, "name" character varying(24) NOT NULL, "color" character varying(7) NOT NULL DEFAULT '#ffb43a', "permissions" text array NOT NULL DEFAULT '{}', "position" integer NOT NULL, "is_default" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_a4b28d7f90fe291f7d8e9961439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_80c9bfc89cba1ea666f82d8e40" ON "clan_roles" ("clan_id", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "clan_members" ("clan_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_574909eed356a35563725964224" PRIMARY KEY ("clan_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "clan_invites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clan_id" uuid NOT NULL, "user_id" uuid NOT NULL, "kind" character varying(8) NOT NULL, "invited_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_622d14d68b9a7265739c0576f3f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1b06cd9acdacd566bcd50f3415" ON "clan_invites" ("clan_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "clan_images" ("clan_id" uuid NOT NULL, "kind" character varying(16) NOT NULL, "mime_type" character varying(32) NOT NULL, "data" bytea NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_770a47c990ea40594dd695596b0" PRIMARY KEY ("clan_id", "kind"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "clans" ADD CONSTRAINT "FK_9637bf34a57c1999a9dd6fdd239" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_roles" ADD CONSTRAINT "FK_e3ab9f042d0be71e52a855d2a2f" FOREIGN KEY ("clan_id") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_members" ADD CONSTRAINT "FK_fb010fb2f806c38346c9f11d48a" FOREIGN KEY ("clan_id") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_members" ADD CONSTRAINT "FK_0bd6ad2583e2e011c8233e48122" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_members" ADD CONSTRAINT "FK_11e3f3a86f6b30fc661d8d0464c" FOREIGN KEY ("role_id") REFERENCES "clan_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_invites" ADD CONSTRAINT "FK_2ee1ba4c94f1e1722616531ab9c" FOREIGN KEY ("clan_id") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_invites" ADD CONSTRAINT "FK_beeda051c8a540c738535b498e8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_invites" ADD CONSTRAINT "FK_4d3af6146771b315544b289e672" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_images" ADD CONSTRAINT "FK_6103608be9d77b84d1bf230fd24" FOREIGN KEY ("clan_id") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clan_images" DROP CONSTRAINT "FK_6103608be9d77b84d1bf230fd24"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_invites" DROP CONSTRAINT "FK_4d3af6146771b315544b289e672"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_invites" DROP CONSTRAINT "FK_beeda051c8a540c738535b498e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_invites" DROP CONSTRAINT "FK_2ee1ba4c94f1e1722616531ab9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_members" DROP CONSTRAINT "FK_11e3f3a86f6b30fc661d8d0464c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_members" DROP CONSTRAINT "FK_0bd6ad2583e2e011c8233e48122"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_members" DROP CONSTRAINT "FK_fb010fb2f806c38346c9f11d48a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clan_roles" DROP CONSTRAINT "FK_e3ab9f042d0be71e52a855d2a2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clans" DROP CONSTRAINT "FK_9637bf34a57c1999a9dd6fdd239"`,
    );
    await queryRunner.query(`DROP TABLE "clan_images"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b06cd9acdacd566bcd50f3415"`,
    );
    await queryRunner.query(`DROP TABLE "clan_invites"`);
    await queryRunner.query(`DROP TABLE "clan_members"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80c9bfc89cba1ea666f82d8e40"`,
    );
    await queryRunner.query(`DROP TABLE "clan_roles"`);
    await queryRunner.query(`DROP TABLE "clans"`);
  }
}
