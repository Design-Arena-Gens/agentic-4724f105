import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/inMemoryStore';
import { setSessionCookie } from '@/lib/simpleSession';

const BodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  teamCode: z.string().min(1),
});

function resolveTeamId(teamCode: string): string | null {
  if (teamCode === 'demo' || teamCode === 'DEMO') return 'team-demo-123';
  // Allow direct team id
  if (db.teams.has(teamCode)) return teamCode;
  return null;
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
    });
  }
  const { name, email, teamCode } = parsed.data;
  const teamId = resolveTeamId(teamCode);
  if (!teamId) {
    return new Response(JSON.stringify({ error: 'Unknown team' }), {
      status: 404,
    });
  }
  const user = db.createUser(name, email, teamId);
  const res = new Response(
    JSON.stringify({ user: { id: user.id, name: user.name, teamId } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
  setSessionCookie(res, { id: user.id, name: user.name, email: user.email, teamId });
  return res;
}
