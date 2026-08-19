import { useMemo, useState } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import { allEntries } from '../data';
import { useBlobUrl } from '../hooks';
import { dayLabel, domainOf, fullDate, monthKey, monthLabel } from '../util';
import Lightbox, { type LightboxImage } from './Lightbox';

export default function Log({ db, go }: { db: DB; go: (v: View) => void }) {
  const [withPhotos, setWithPhotos] = useState(false);
  const [viewing, setViewing] = useState<{ images: LightboxImage[]; start: number } | null>(null);

  const entries = useMemo(() => allEntries(db), [db]);
  const shown = withPhotos
    ? entries.filter((e) => e.attachments.some((a) => a.kind === 'image'))
    : entries;

  const sessions = entries.length;
  const hours = Math.round(entries.reduce((n, e) => n + (e.durationMin || 0), 0) / 60);
  const first = entries.length ? entries[entries.length - 1].at : null;

  const months: { key: string; entries: typeof shown }[] = [];
  for (const entry of shown) {
    const key = monthKey(entry.at);
    const last = months[months.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else months.push({ key, entries: [entry] });
  }

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

      <div className="toggle" role="group" aria-label="Filter">
        <button
          type="button"
          className={withPhotos ? 'toggle-btn' : 'toggle-btn toggle-on'}
          onClick={() => setWithPhotos(false)}
        >
          All
        </button>
        <button
          type="button"
          className={withPhotos ? 'toggle-btn toggle-on' : 'toggle-btn'}
          onClick={() => setWithPhotos(true)}
        >
          With photos
        </button>
      </div>

      {shown.length === 0 && <p className="empty">Nothing logged yet.</p>}

      {months.map((month) => (
        <section key={month.key} className="month">
          <h2 className="month-title">{monthLabel(month.key)}</h2>
          <ul className="entries">
            {month.entries.map((entry) => {
              const images = entry.attachments.filter((a) => a.kind === 'image');
              const links = entry.attachments.filter((a) => a.kind === 'link');
              return (
                <li key={entry.id} className="entry">
                  <p className="entry-meta">
                    <span className="entry-date">{dayLabel(entry.at)}</span>
                    <span className="entry-project">{entry.projectName}</span>
                  </p>
                  <p className="entry-did">{entry.did}</p>
                  {entry.broke && <p className="entry-broke">{entry.broke}</p>}

                  {images.length > 0 && (
                    <div className="thumbs">
                      {images.map(
                        (a, i) =>
                          a.kind === 'image' && (
                            <Thumb
                              key={a.id}
                              blobKey={a.thumbKey}
                              caption={a.caption}
                              onOpen={() =>
                                setViewing({
                                  images: images.map((x) =>
                                    x.kind === 'image'
                                      ? { blobKey: x.blobKey, caption: x.caption }
                                      : { blobKey: '' },
                                  ),
                                  start: i,
                                })
                              }
                            />
                          ),
                      )}
                    </div>
                  )}

                  {links.map(
                    (a) =>
                      a.kind === 'link' && (
                        <a
                          key={a.id}
                          className="link-row"
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="link-domain">{domainOf(a.url)}</span>
                          {a.caption && <span className="link-caption">{a.caption}</span>}
                        </a>
                      ),
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <footer className="log-foot">
        <button type="button" className="link" onClick={() => go({ name: 'settings' })}>
          Settings
        </button>
      </footer>

      {viewing && (
        <Lightbox images={viewing.images} start={viewing.start} onClose={() => setViewing(null)} />
      )}
    </main>
  );
}

function Thumb({
  blobKey,
  caption,
  onOpen,
}: {
  blobKey: string;
  caption?: string;
  onOpen: () => void;
}) {
  const url = useBlobUrl(blobKey);
  return (
    <button type="button" className="thumb" onClick={onOpen} aria-label={caption || 'Open photo'}>
      {url && <img src={url} alt="" />}
    </button>
  );
}
