import { useEffect, useState } from 'react';
import type { DB, LogEntry } from '../types';
import type { View } from '../App';
import { useBlobUrl, useNoExit } from '../hooks';
import { domainOf } from '../util';

const STEPS: { title: string; body: string; confirm: string }[] = [
  {
    title: 'Open the project',
    body: 'Open the folder, the repo, the file. That is the whole step.',
    confirm: 'Open',
  },
  {
    title: 'Re-run the last thing that worked',
    body: 'Do not fix anything. Do not improve anything.',
    confirm: 'Ran it',
  },
  { title: 'Read your last entry', body: '', confirm: 'Read it' },
  { title: 'Read the next action', body: '', confirm: 'That is the action' },
  {
    title: 'Do it for ten minutes',
    body: 'Ten minutes on the clock. That is the whole commitment.',
    confirm: 'Start ten minutes',
  },
];

export default function ColdStart({
  db,
  projectId,
  go,
}: {
  db: DB;
  projectId: string;
  go: (v: View) => void;
}) {
  const [step, setStep] = useState(0);
  useNoExit(true);

  const project = db.projects.find((p) => p.id === projectId);
  useEffect(() => {
    if (!project) go({ name: 'home' });
  }, [project, go]);

  if (!project) return null;

  const last: LogEntry | undefined = project.log[project.log.length - 1];

  const advance = () => {
    if (step === STEPS.length - 1) {
      go({ name: 'session', projectId, floor: true, coldStart: true });
      return;
    }
    setStep(step + 1);
  };

  return (
    <main className="screen coldstart">
      <p className="pinned">You are not allowed to re-plan. Resume at the next action.</p>

      <ol className="steps">
        {STEPS.slice(0, step + 1).map((s, i) => (
          <li key={i} className={i === step ? 'step step-current' : 'step step-done'}>
            <p className="step-index">{i + 1}</p>
            <h2 className="step-title">{s.title}</h2>
            {s.body && <p className="step-body">{s.body}</p>}

            {i === 2 && <LastEntry entry={last} />}
            {i === 3 && <p className="step-action">{project.nextAction}</p>}

            {i === step && (
              <button type="button" className="btn" onClick={advance}>
                {s.confirm}
              </button>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}

function LastEntry({ entry }: { entry: LogEntry | undefined }) {
  const image = entry?.attachments.find((a) => a.kind === 'image');
  const url = useBlobUrl(image && image.kind === 'image' ? image.blobKey : null);
  const links = entry?.attachments.filter((a) => a.kind === 'link') ?? [];

  if (!entry) return <p className="step-body muted">No entry yet.</p>;

  return (
    <div className="last-entry">
      {url && <img className="last-entry-photo" src={url} alt="" />}
      {image?.kind === 'image' && image.caption && <p className="caption">{image.caption}</p>}
      <p className="last-entry-did">{entry.did}</p>
      {entry.broke && <p className="last-entry-broke">{entry.broke}</p>}
      {links.map(
        (l) =>
          l.kind === 'link' && (
            <a
              key={l.id}
              className="link-row"
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="link-domain">{domainOf(l.url)}</span>
              {l.caption && <span className="link-caption">{l.caption}</span>}
            </a>
          ),
      )}
    </div>
  );
}
