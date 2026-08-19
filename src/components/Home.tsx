import type { DB } from '../types';
import type { View } from '../App';
import { isColdStart, lastTouchedLabel } from '../util';
import River from './River';

export default function Home({ db, go }: { db: DB; go: (v: View) => void }) {
  const active = db.projects.filter((p) => !p.archived);

  return (
    <main className="screen home">
      {active.length === 0 ? (
        <p className="empty">Nothing here yet. Add one thing you’ve stopped doing.</p>
      ) : (
        <ul className="cards">
          {active.map((project) => {
            const cold = isColdStart(project.lastTouchedAt);
            return (
              <li key={project.id} className="card">
                <button
                  type="button"
                  className="card-body"
                  onClick={() => go({ name: 'project', projectId: project.id })}
                >
                  <span className="card-project">{project.name}</span>
                  <span className="card-action">{project.nextAction}</span>
                  <River projectId={project.id} sessions={project.log.length} />
                  <span className="card-touched">{lastTouchedLabel(project.lastTouchedAt)}</span>
                </button>
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
