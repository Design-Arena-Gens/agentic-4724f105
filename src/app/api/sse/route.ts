import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/simpleSession';
import { sseHub } from '@/lib/realtime';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = getSessionUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const teamIdParam = searchParams.get('teamId');
  const teamId = teamIdParam || user.teamId;
  if (teamId !== user.teamId) return new Response('Forbidden', { status: 403 });

  const stream = sseHub.subscribe(teamId);
  return new Response(stream as any, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
