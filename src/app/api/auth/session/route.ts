import { NextRequest } from 'next/server';
import { destroySessionCookie, getSessionUser } from '@/lib/simpleSession';

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(
    JSON.stringify({ authenticated: true, user }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req: NextRequest) {
  // logout
  const res = new Response(JSON.stringify({ ok: true }));
  destroySessionCookie(res);
  return res;
}
