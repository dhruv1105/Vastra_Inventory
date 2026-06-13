import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT 1 AS db_is_alive');
    
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
      dbResult: result.rows[0]
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      db: 'disconnected',
      message: message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
