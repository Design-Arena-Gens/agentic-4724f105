import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/inMemoryStore';
import { getSessionUser } from '@/lib/simpleSession';
import { sseHub } from '@/lib/realtime';

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  participantEmails: z.array(z.string().email()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const meeting = db.meetings.get(params.id);
  if (!meeting || meeting.teamId !== user.teamId)
    return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify({ meeting }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const meeting = db.meetings.get(params.id);
  if (!meeting || meeting.teamId !== user.teamId)
    return new Response('Not found', { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return new Response('Invalid payload', { status: 400 });
  const now = new Date().toISOString();
  const updated = { ...meeting, ...parsed.data, updatedAt: now };
  db.meetings.set(updated.id, updated);
  sseHub.broadcast(user.teamId, 'meeting.updated', updated);
  return new Response(JSON.stringify({ meeting: updated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const meeting = db.meetings.get(params.id);
  if (!meeting || meeting.teamId !== user.teamId)
    return new Response('Not found', { status: 404 });
  db.meetings.delete(meeting.id);
  sseHub.broadcast(user.teamId, 'meeting.deleted', { id: meeting.id });
  return new Response(null, { status: 204 });
}
