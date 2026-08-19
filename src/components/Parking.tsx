import { useState } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import { setParkingResolved } from '../data';

export default function Parking({
  db,
  mutate,
  go,
}: {
  db: DB;
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
}) {
  const [hideResolved, setHideResolved] = useState(false);

  const items = [...db.parking].sort((a, b) => b.at.localeCompare(a.at));
  const shown = hideResolved ? items.filter((i) => !i.resolved) : items;

  return (
    <main className="screen parking">
      <button type="button" className="link back" onClick={() => go({ name: 'home' })}>
        Back
      </button>

      <label className="check-row">
        <input
          type="checkbox"
          checked={hideResolved}
          onChange={(e) => setHideResolved(e.target.checked)}
        />
        <span>Hide resolved</span>
      </label>

      {shown.length === 0 && <p className="empty">Nothing parked.</p>}

      <ul className="parking-list">
        {shown.map((item) => {
          const project = db.projects.find((p) => p.id === item.projectId);
          return (
            <li key={item.id} className={item.resolved ? 'parked parked-done' : 'parked'}>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={item.resolved}
                  onChange={(e) => mutate((c) => setParkingResolved(c, item.id, e.target.checked))}
                />
                <span className="parked-text">{item.text}</span>
              </label>
              {project && <p className="parked-project">{project.name}</p>}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
