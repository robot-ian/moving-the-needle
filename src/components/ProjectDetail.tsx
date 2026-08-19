import { useEffect, useMemo, useState } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import type { FlatEntry } from '../data';
import { canCorrectNextAction, correctNextAction, renameProject, setArchived } from '../data';
import { isColdStart, lastTouchedLabel } from '../util';
import EntryList from './EntryList';
import NextActionField from './NextActionField';
import River from './River';

type Props = {
  db: DB;
  projectId: string;
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
};

export default function ProjectDetail({ db, projectId, mutate, go }: Props) {
  const project = db.projects.find((p) => p.id === projectId);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingAction, setEditingAction] = useState(false);
  const [actionDraft, setActionDraft] = useState('');

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
  // Outside the correction window the pencil does not render at all: no
  // disabled state, no tooltip, nothing to reach for after a gap.
  const correctable = canCorrectNextAction(project);

  const commitName = () => {
    if (nameDraft.trim()) mutate((current) => renameProject(current, project.id, nameDraft));
    setEditingName(false);
  };

  const commitAction = (text: string) => {
    mutate((current) => correctNextAction(current, project.id, text));
    setEditingAction(false);
  };

  const archive = () => {
    mutate((current) => setArchived(current, project.id, true));
    go({ name: 'home' });
  };

  return (
    <main className="screen project">
      <button type="button" className="link back" onClick={() => go({ name: 'home' })}>
        Back
      </button>

      {editingName ? (
        <input
          className="input input-name"
          value={nameDraft}
          aria-label="Project name"
          autoFocus
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditingName(false);
          }}
        />
      ) : (
        <div className="titled">
          <p className="project-name">{project.name}</p>
          <Pencil
            label="Edit project name"
            onClick={() => {
              setNameDraft(project.name);
              setEditingName(true);
            }}
          />
        </div>
      )}

      <River projectId={project.id} sessions={project.log.length} width={300} height={108} />

      {editingAction ? (
        <NextActionField
          id="correct-action"
          projectName={project.name}
          label="Correct the next action"
          value={actionDraft}
          onChange={setActionDraft}
          onAccept={commitAction}
          submitLabel="Save"
          onCancel={() => setEditingAction(false)}
          autoFocus
        />
      ) : (
        <div className="titled">
          <p className="project-action">{project.nextAction}</p>
          {correctable && (
            <Pencil
              label="Correct the next action"
              onClick={() => {
                setActionDraft(project.nextAction);
                setEditingAction(true);
              }}
            />
          )}
        </div>
      )}

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

function Pencil({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="pencil" aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
        <path
          d="M4 20h4L19 9a2.5 2.5 0 0 0-4-4L4 16v4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
