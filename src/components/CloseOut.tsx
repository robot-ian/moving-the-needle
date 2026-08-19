import { useEffect, useRef, useState } from 'react';
import type { Attachment, DB } from '../types';
import type { View } from '../App';
import { closeOut } from '../data';
import { putBlob } from '../idb';
import { compress } from '../images';
import { requestPersistenceOnce, savePending } from '../store';
import { useNoExit } from '../hooks';
import { uid, wordCount } from '../util';
import NextActionField from './NextActionField';

const MAX_ATTACHMENTS = 4;
const MAX_CAPTION = 60;

type Draft =
  | { key: string; kind: 'image'; full: Blob; thumb: Blob; preview: string; caption: string }
  | { key: string; kind: 'link'; url: string; caption: string };

type Props = {
  db: DB;
  view: Extract<View, { name: 'closeout' }>;
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
  onStorageError: (message: string) => void;
};

/** Mandatory. There is no dismiss, and closing the app reopens it here. */
export default function CloseOut({ db, view, mutate, go, onStorageError }: Props) {
  const [step, setStep] = useState(0);
  const [did, setDid] = useState('');
  const [broke, setBroke] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useNoExit(true);

  const project = db.projects.find((p) => p.id === view.projectId);
  useEffect(() => {
    if (!project) {
      savePending(null);
      go({ name: 'home' });
    }
  }, [project, go]);
  // Previews are revoked on unmount only, never when the list changes.
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  useEffect(
    () => () => draftsRef.current.forEach((d) => d.kind === 'image' && URL.revokeObjectURL(d.preview)),
    [],
  );

  if (!project) return null;

  const addPhoto = async (file: File | undefined) => {
    if (!file || drafts.length >= MAX_ATTACHMENTS) return;
    setProblem(null);
    try {
      const { full, thumb } = await compress(file);
      setDrafts((d) => [
        ...d,
        { key: uid(), kind: 'image', full, thumb, preview: URL.createObjectURL(thumb), caption: '' },
      ]);
    } catch {
      setProblem('That image could not be read. The rest of your entry is fine.');
    }
  };

  const addLink = () => {
    const raw = linkUrl.trim();
    if (!raw || drafts.length >= MAX_ATTACHMENTS) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setDrafts((d) => [...d, { key: uid(), kind: 'link', url, caption: '' }]);
    setLinkUrl('');
    setLinkOpen(false);
  };

  const setCaption = (key: string, caption: string) =>
    setDrafts((d) => d.map((item) => (item.key === key ? { ...item, caption } : item)));

  const remove = (key: string) =>
    setDrafts((d) => {
      const item = d.find((x) => x.key === key);
      if (item && item.kind === 'image') URL.revokeObjectURL(item.preview);
      return d.filter((x) => x.key !== key);
    });

  const submit = async () => {
    if (busy) return;
    setBusy(true);

    // Images are written first, but a failure here must never cost the text.
    const attachments: Attachment[] = [];
    let lostImages = 0;
    for (const draft of drafts) {
      if (draft.kind === 'link') {
        attachments.push({
          kind: 'link',
          id: draft.key,
          url: draft.url,
          caption: draft.caption.trim() || undefined,
        });
        continue;
      }
      const blobKey = `img-${draft.key}`;
      const thumbKey = `thm-${draft.key}`;
      try {
        await putBlob(blobKey, draft.full);
        await putBlob(thumbKey, draft.thumb);
        attachments.push({
          kind: 'image',
          id: draft.key,
          blobKey,
          thumbKey,
          caption: draft.caption.trim() || undefined,
        });
      } catch {
        lostImages++;
      }
    }

    mutate((current) =>
      closeOut(current, {
        projectId: view.projectId,
        did,
        broke,
        nextAction,
        durationMin: view.durationMin,
        wasFloor: view.wasFloor,
        wasColdStart: view.wasColdStart,
        attachments,
      }),
    );
    savePending(null);
    requestPersistenceOnce();

    if (lostImages > 0) {
      onStorageError('A photo could not be saved. Your entry is safe. Export a backup and clear some space.');
    }
    go({ name: 'home' });
  };

  return (
    <main className="screen closeout">
      <p className="closeout-project">{project.name}</p>

      <div className="field">
        <label className="field-label" htmlFor="did">
          What I did
        </label>
        <textarea
          id="did"
          className="input"
          rows={3}
          value={did}
          autoFocus
          autoCapitalize="sentences"
          onChange={(e) => setDid(e.target.value)}
        />
        {step === 0 && (
          <button
            type="button"
            className="btn"
            disabled={wordCount(did) < 3}
            onClick={() => setStep(1)}
          >
            Next
          </button>
        )}
      </div>

      {step >= 1 && (
        <div className="field">
          <label className="field-label" htmlFor="broke">
            What broke
          </label>
          <textarea
            id="broke"
            className="input"
            rows={3}
            value={broke}
            autoCapitalize="sentences"
            placeholder="Nothing, or say what."
            onChange={(e) => setBroke(e.target.value)}
          />
          {step === 1 && (
            <button type="button" className="btn" onClick={() => setStep(2)}>
              Next
            </button>
          )}
        </div>
      )}

      {step >= 2 && step < 3 && (
        <NextActionField
          projectName={project.name}
          label="What I do next"
          value={nextAction}
          onChange={setNextAction}
          onAccept={(v) => {
            setNextAction(v);
            setStep(3);
          }}
          submitLabel="Set it"
        />
      )}

      {step >= 3 && (
        <>
          <div className="field">
            <p className="field-label">What I do next</p>
            <p className="settled-action">{nextAction}</p>
          </div>

          <div className="attachments">
            <p className="attach-prompt">
              Anything worth seeing? A photo of where you left off is the fastest way back in.
            </p>

            {drafts.length > 0 && (
              <ul className="draft-list">
                {drafts.map((d) => (
                  <li key={d.key} className="draft">
                    {d.kind === 'image' ? (
                      <img className="draft-thumb" src={d.preview} alt="" />
                    ) : (
                      <span className="draft-link">{d.url}</span>
                    )}
                    <input
                      className="input input-caption"
                      value={d.caption}
                      maxLength={MAX_CAPTION}
                      placeholder="Caption"
                      aria-label="Caption"
                      onChange={(e) => setCaption(d.key, e.target.value)}
                    />
                    <button type="button" className="link" onClick={() => remove(d.key)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {drafts.length < MAX_ATTACHMENTS && (
              <div className="attach-row">
                <button type="button" className="btn-quiet" onClick={() => fileRef.current?.click()}>
                  Add photo
                </button>
                <button type="button" className="btn-quiet" onClick={() => setLinkOpen(!linkOpen)}>
                  Add link
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden-input"
              onChange={(e) => {
                void addPhoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {linkOpen && (
              <div className="attach-row">
                <input
                  className="input"
                  value={linkUrl}
                  placeholder="https://"
                  inputMode="url"
                  aria-label="Link"
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                />
                <button type="button" className="btn-quiet" onClick={addLink}>
                  Add
                </button>
              </div>
            )}

            {problem && (
              <p className="notice" role="status">
                {problem}
              </p>
            )}

            <button type="button" className="btn" disabled={busy} onClick={() => void submit()}>
              {drafts.length > 0 ? 'Done' : 'Skip'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
