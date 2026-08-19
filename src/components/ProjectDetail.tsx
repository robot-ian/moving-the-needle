import { useEffect, useMemo } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import type { FlatEntry } from '../data';
import { setArchived } from '../data';
import { isColdStart, lastTouchedLabel } from '../util';
import EntryList from './EntryList';
import River from './River';

type Props = {
  db: DB;
  projectId: string;
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
};

export default function ProjectDetail({ db, projectId, mutate, go }: Props) {
  const project = db.projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!project) go({ name: 'home' });
  }, [project, go]);

  const entries = useMemo<FlatEntry[]>(() => {
    if (!project) return [];
    return project.log
      .map((e) => ({ ...e, projectId: project.id, projectName: project.name }))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [project]);

  if (!project) return null;

  const cold = isColdStart(project.lastTouchedAt);

  const archive = () => {
    mutate((current) => setArchived(current, project.id, true));
    go({ name: 'home' });
  };

  return (
    <main className="screen project">
      <button type="button" className="link back" onClick={() => go({ name: 'home' })}>
        Back
      </button>

      <p className="project-name">{project.name}</p>
      <River projectId={project.id} sessions={project.log.length} width={300} height={108} />
      <p className="project-action">{project.nextAction}</p>
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

      <EntryList entries={entries} showProject={false} emptyLabel="No sessions logged yet." />

      <footer className="project-foot">
        <button type="button" className="link" onClick={archive}>
          Archive project
        </button>
      </footer>
    </main>
  );
}
