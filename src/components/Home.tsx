import type { DB } from '../types';
import type { View } from '../App';
import { isColdStart, lastTouchedLabel } from '../util';
import { totalSessions } from '../store';
import River from './River';

export default function Home({ db, go }: { db: DB; go: (v: View) => void }) {
  const active = db.projects.filter((p) => !p.archived);

  return (
    <main className="screen home">
      <River sessions={totalSessions(db)} />

      {active.length === 0 ? (
        <p className="empty">Nothing here yet. Add one thing you’ve stopped doing.</p>
      ) : (
        <ul className="cards">
          {active.map((project) => {
            const cold = isColdStart(project.lastTouchedAt);
            return (
              <li key={project.id} className="card">
                <p className="card-project">{project.name}</p>
                <p className="card-action">{project.nextAction}</p>
                <p className="card-touched">{lastTouchedLabel(project.lastTouchedAt)}</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    go(
                      cold
                        ? { name: 'coldstart', projectId: project.id }
                        : { name: 'session', projectId: project.id, floor: false, coldStart: false },
                    )
                  }
                >
                  {cold ? 'Restart' : 'Start'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <nav className="home-nav">
        <button type="button" className="link" onClick={() => go({ name: 'new' })}>
          New project
        </button>
        <button type="button" className="link" onClick={() => go({ name: 'log' })}>
          Log
        </button>
        <button type="button" className="link" onClick={() => go({ name: 'parking' })}>
          Parking
        </button>
      </nav>
    </main>
  );
}
