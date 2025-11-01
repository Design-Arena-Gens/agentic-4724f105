import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Team Meeting Scheduler',
  description: 'Meetings with real-time updates and reminders',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1>Team Meeting Scheduler</h1>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
