import { Pool, QueryResult } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/** Typed query builder over the same pool. Use it for new code; db/schema.ts has the tables. */
export const db = drizzle(pool, { schema });

/** Raw parameterised SQL, used by the existing routes. */
export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Database query error:', error);
    }
    throw error;
  }
};

export { pool };
