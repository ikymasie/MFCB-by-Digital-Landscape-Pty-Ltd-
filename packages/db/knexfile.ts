import type { Knex } from 'knex';

const NEON_CONNECTION_STRING =
  'postgresql://neondb_owner:npg_Uhl4LoVnKZg8@ep-withered-glade-apsk712t-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL ?? NEON_CONNECTION_STRING,
  migrations: {
    directory: './src/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/seeds',
    extension: 'ts',
  },
  pool: {
    min: 1,
    max: 5,
  },
};

export default config;
