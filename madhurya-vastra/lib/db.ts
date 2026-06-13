import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
