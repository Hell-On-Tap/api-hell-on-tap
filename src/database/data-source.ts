import 'dotenv/config';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

/**
 * Configuração única do banco: usada pela API (app.module) e pela CLI do
 * TypeORM nos scripts de migration (npm run migration:*).
 * Lê as variáveis DB_* do .env.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // funciona tanto rodando o .ts (CLI) quanto o .js compilado (dist)
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  // ids com gen_random_uuid(): nativo do PostgreSQL 13+, sem extensão extra
  uuidExtension: 'pgcrypto',
  // o banco só muda por migration
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
