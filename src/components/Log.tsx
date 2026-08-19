import { useMemo } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import { allEntries } from '../data';
import { fullDate } from '../util';
import EntryList from './EntryList';

export default function Log({ db, go }: { db: DB; go: (v: View) => void }) {
  const entries = useMemo(() => allEntries(db), [db]);

  const sessions = entries.length;
  const hours = Math.round(entries.reduce((n, e) => n + (e.durationMin || 0), 0) / 60);
  const first = entries.length ? entries[entries.length - 1].at : null;

  return (
    <main className="screen log">
      <button type="button" className="link back" onClick={() => go({ name: 'home' })}>
        Back
      </button>

      {sessions > 0 && first && (
        <p className="tally">
          {sessions} {sessions === 1 ? 'session' : 'sessions'} · {hours}{' '}
          {hours === 1 ? 'hour' : 'hours'} · since {fullDate(first)}
        </p>
      )}

      <EntryList entries={entries} />

      <footer className="log-foot">
        <button type="button" className="link" onClick={() => go({ name: 'settings' })}>
          Settings
        </button>
      </footer>
    </main>
  );
}
