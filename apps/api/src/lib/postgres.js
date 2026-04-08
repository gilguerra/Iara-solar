import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pgPool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  database: env.postgres.database,
  user: env.postgres.user,
  password: env.postgres.password,
  max: 10,
});

export async function checkPostgres() {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT NOW() AS now');
    return {
      ok: true,
      now: result.rows[0].now,
    };
  } finally {
    client.release();
  }
}
