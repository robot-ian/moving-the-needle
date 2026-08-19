import { useEffect, useRef, useState } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import { exportJson, exportZip, importFile } from '../backup';
import { renameProject, setArchived } from '../data';
import { totalBytes } from '../idb';
import { markAllRiverSeen, saveDB, savePending } from '../store';
import { APP_VERSION, REPO_URL } from '../config';

type Props = {
  db: DB;
  setDb: (db: DB) => void;
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
};

export default function Settings({ db, setDb, mutate, go }: Props) {
  const [bytes, setBytes] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void totalBytes().then(setBytes);
  }, []);

  const runImport = async (file: File | undefined) => {
    if (!file) return;
    const ok = window.confirm('Import replaces everything currently in the app. Continue?');
    if (!ok) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await importFile(file);
      saveDB(result.db);
      savePending(null);
      markAllRiverSeen(result.db);
      setDb(result.db);
      setNote(
        result.imagesMissing > 0
          ? `Imported. ${result.imagesRestored} photos restored, ${result.imagesMissing} not in the file.`
          : `Imported. ${result.imagesRestored} photos restored.`,
      );
      setBytes(await totalBytes());
    } catch {
      setNote('That file could not be read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen settings">
      <button type="button" className="link back" onClick={() => go({ name: 'log' })}>
        Back
      </button>

      <section className="block">
        <h2 className="block-title">Backup</h2>
        <div className="attach-row">
          <button
            type="button"
            className="btn-quiet"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void exportZip(db).finally(() => setBusy(false));
            }}
          >
            Export
          </button>
          <button type="button" className="btn-quiet" onClick={() => exportJson(db)}>
            Export text only
          </button>
        </div>
        <button type="button" className="btn-quiet" disabled={busy} onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="hidden-input"
          onChange={(e) => {
            void runImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {note && (
          <p className="notice" role="status">
            {note}
          </p>
        )}
        <p className="muted small">
          Photos use about {bytes === null ? '…' : (bytes / 1048576).toFixed(1)} MB.
        </p>
      </section>

      <section className="block">
        <h2 className="block-title">Projects</h2>
        {db.projects.length === 0 && <p className="muted small">No projects yet.</p>}
        <ul className="project-admin">
          {db.projects.map((project) => (
            <ProjectRow
              key={project.id}
              id={project.id}
              name={project.name}
              archived={project.archived}
              mutate={mutate}
            />
          ))}
        </ul>
        <p className="muted small">Archiving hides a project from Home. Its entries stay in the log.</p>
      </section>

      <section className="block">
        <h2 className="block-title">About</h2>
        <p className="muted small">Moving the Needle {APP_VERSION}</p>
        <p className="muted small">
          <a className="link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </p>
      </section>
    </main>
  );
}

/** The project name is the one editable field in the app. */
function ProjectRow({
  id,
  name,
  archived,
  mutate,
}: {
  id: string;
  name: string;
  archived: boolean;
  mutate: (fn: (db: DB) => DB) => DB;
}) {
  const [draft, setDraft] = useState(name);

  const commit = () => {
    if (draft.trim()) mutate((c) => renameProject(c, id, draft));
    else setDraft(name);
  };

  return (
    <li>
      <input
        className="input"
        value={draft}
        aria-label="Project name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <button
        type="button"
        className="btn-quiet"
        onClick={() => mutate((c) => setArchived(c, id, !archived))}
      >
        {archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  );
}
