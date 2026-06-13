import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cognitoSub, name, email, phone, avatarUrl } = body;

    if (!cognitoSub) {
      return NextResponse.json({ error: 'cognitoSub is required' }, { status: 400 });
    }

    // Check if user exists
    const checkResult = await query('SELECT * FROM users WHERE cognito_sub = $1', [cognitoSub]);
    
    if (checkResult.rows.length > 0) {
      return NextResponse.json(checkResult.rows[0], { status: 200 });
    }

    // Insert new user if not exists
    const insertResult = await query(
      `INSERT INTO users (cognito_sub, name, email, phone, avatar_url, role) 
       VALUES ($1, $2, $3, $4, $5, 'owner') 
       RETURNING *`,
      [cognitoSub, name || '', email || null, phone || null, avatarUrl || null]
    );

    return NextResponse.json(insertResult.rows[0], { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
