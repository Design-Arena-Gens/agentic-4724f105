"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

type Meeting = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  participantEmails: string[];
};

type Session = { authenticated: boolean; user?: { id: string; name: string; teamId: string } };

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const sres = await fetch('/api/auth/session');
      const sdata = await sres.json();
      setSession(sdata);
      if (!sdata.authenticated) {
        window.location.href = '/';
        return;
      }
      await refreshMeetings();
      // SSE subscribe
      const es = new EventSource('/api/sse');
      es.onmessage = () => {};
      es.addEventListener('meeting.created', () => refreshMeetings());
      es.addEventListener('meeting.updated', () => refreshMeetings());
      es.addEventListener('meeting.deleted', () => refreshMeetings());
      es.addEventListener('meeting.reminder', () => refreshMeetings());
    })();
  }, []);

  const refreshMeetings = useCallback(async () => {
    const mres = await fetch('/api/meetings');
    if (!mres.ok) return;
    const data = await mres.json();
    setMeetings(data.meetings);
  }, []);

  const events = useMemo(
    () =>
      meetings.map((m) => ({ id: m.id, title: m.title, start: m.start, end: m.end })),
    [meetings]
  );

  return (
    <div className="grid two">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Team Calendar</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost" onClick={refreshMeetings}>Refresh</button>
            <button className="button" onClick={() => setCreating(true)}>New meeting</button>
          </div>
        </div>
        <hr />
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ start: 'prev,next today', center: 'title', end: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          height={750}
          events={events}
        />
      </div>
      <div className="card">
        <h3>Upcoming</h3>
        <ul>
          {meetings
            .slice()
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
            .map((m) => (
              <li key={m.id} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>{new Date(m.start).toLocaleString()} 
                  ? {new Date(m.end).toLocaleString()}</div>
                <div className="badge">{m.participantEmails.length} participants</div>
              </li>
            ))}
        </ul>
      </div>

      {creating ? (
        <CreateMeetingModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refreshMeetings(); }} />
      ) : null}
    </div>
  );
}

function CreateMeetingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [participantEmails, setParticipantEmails] = useState<string>('alice@example.com,bob@example.com');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const emails = participantEmails
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: description || undefined, start, end, participantEmails: emails }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const t = await res.text();
      setError(t);
      return;
    }
    onCreated();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 560 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>Schedule meeting</h3>
          <button className="button ghost" onClick={onClose}>Close</button>
        </div>
        {error ? <div className="alert" style={{ marginTop: 12 }}>{error}</div> : null}
        <form className="grid" onSubmit={submit}>
          <div className="col">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="col">
            <label>Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid two">
            <div className="col">
              <label>Start</label>
              <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="col">
              <label>End</label>
              <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="col">
            <label>Participants (comma-separated emails)</label>
            <input className="input" value={participantEmails} onChange={(e) => setParticipantEmails(e.target.value)} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="button" disabled={submitting}>
              {submitting ? 'Scheduling...' : 'Create meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
