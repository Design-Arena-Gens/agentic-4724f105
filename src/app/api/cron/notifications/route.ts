import { NextRequest } from 'next/server';
import { db } from '@/lib/inMemoryStore';
import { sendEmail, recordNotification } from '@/lib/email';
import { sseHub } from '@/lib/realtime';

export async function GET(_req: NextRequest) {
  const nowIso = new Date().toISOString();
  const due = db.dueReminders(nowIso);
  for (const meeting of due) {
    for (const email of meeting.participantEmails) {
      await sendEmail(
        email,
        `Reminder: ${meeting.title}`,
        `Starting at ${new Date(meeting.start).toLocaleString()}.`
      );
      recordNotification(meeting.id, 'reminder', email);
    }
    sseHub.broadcast(meeting.teamId, 'meeting.reminder', { meetingId: meeting.id });
  }
  return new Response(JSON.stringify({ ok: true, processed: due.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
