import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/inMemoryStore';
import { getSessionUser } from '@/lib/simpleSession';
import { sendEmail, recordNotification } from '@/lib/email';
import { kafkaPublish } from '@/lib/kafka';
import { sseHub } from '@/lib/realtime';

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  participantEmails: z.array(z.string().email()).default([]),
});

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const meetings = db.listMeetings(user.teamId);
  return new Response(JSON.stringify({ meetings }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  const user = getSessionUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!parsed.success)
    return new Response('Invalid payload', { status: 400 });

  const meeting = db.createMeeting({
    teamId: user.teamId,
    title: parsed.data.title,
    description: parsed.data.description,
    start: parsed.data.start,
    end: parsed.data.end,
    organizerId: user.id,
    participantEmails: parsed.data.participantEmails,
  });

  // Kafka simulated publish
  kafkaPublish('meeting.created', { meetingId: meeting.id, teamId: meeting.teamId });

  // Email invites
  await Promise.all(
    meeting.participantEmails.map(async (email) => {
      await sendEmail(
        email,
        `Invitation: ${meeting.title}`,
        `You are invited to a meeting from ${new Date(meeting.start).toLocaleString()} to ${new Date(meeting.end).toLocaleString()}.`
      );
      recordNotification(meeting.id, 'invite', email);
    })
  );

  // SSE broadcast
  sseHub.broadcast(user.teamId, 'meeting.created', meeting);

  return new Response(JSON.stringify({ meeting }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
