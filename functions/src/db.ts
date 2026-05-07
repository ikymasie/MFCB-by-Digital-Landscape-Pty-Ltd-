import knex, { type Knex } from 'knex';
import { config } from './config';

let _db: Knex | null = null;

export function getDb(): Knex {
  if (!_db) {
    _db = knex({
      client: 'pg',
      connection: config.databaseUrl,
      pool: { min: 1, max: 3 }, // conservative for serverless
    });
  }
  return _db;
}
