import { MigrationInterface, QueryRunner } from 'typeorm';

/** Abates, mortes, headshots e tempo de jogo por jogador e modo (mata-mata, 5x5). */
export class AddPlayerStats1791680000000 implements MigrationInterface {
  name = 'AddPlayerStats1791680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "player_stats" (
        "user_id" uuid NOT NULL,
        "mode" character varying(16) NOT NULL,
        "kills" integer NOT NULL DEFAULT 0,
        "deaths" integer NOT NULL DEFAULT 0,
        "headshots" integer NOT NULL DEFAULT 0,
        "play_seconds" integer NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_player_stats" PRIMARY KEY ("user_id", "mode"),
        CONSTRAINT "FK_player_stats_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_player_stats_rank" ON "player_stats" ("mode", "kills" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "player_stats"`);
  }
}
