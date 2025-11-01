"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teamCode, setTeamCode] = useState('demo');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace('/dashboard');
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: email || undefined, teamCode }),
    });
    if (!res.ok) {
      const t = await res.text();
      setError(t);
      return;
    }
    router.replace('/dashboard');
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card" style={{ maxWidth: 520, margin: '48px auto' }}>
      <h2>Sign in to your team</h2>
      <p className="badge">Use team code: demo</p>
      {error ? <div className="alert">{error}</div> : null}
      <form className="grid" onSubmit={onSubmit}>
        <div className="col">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="col">
          <label>Email (optional)</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="col">
          <label>Team Code</label>
          <input className="input" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} required />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="button" type="submit">Continue</button>
        </div>
      </form>
    </div>
  );
}
