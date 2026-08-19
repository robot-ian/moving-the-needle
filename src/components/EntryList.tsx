import { useState } from 'react';
import type { FlatEntry } from '../data';
import { useBlobUrl } from '../hooks';
import { dayLabel, domainOf, monthKey, monthLabel } from '../util';
import Lightbox, { type LightboxImage } from './Lightbox';

/**
 * The one renderer for log entries, shared by the global Log and a project's
 * own page so the two cannot drift. Nothing here reads wasFloor or
 * wasColdStart: a floor session and a long one are the same entry.
 */
export default function EntryList({
  entries,
  showProject = true,
  emptyLabel = 'Nothing logged yet.',
}: {
  entries: FlatEntry[];
  showProject?: boolean;
  emptyLabel?: string;
}) {
  const [withPhotos, setWithPhotos] = useState(false);
  const [viewing, setViewing] = useState<{ images: LightboxImage[]; start: number } | null>(null);

  const shown = withPhotos
    ? entries.filter((e) => e.attachments.some((a) => a.kind === 'image'))
    : entries;

  const months: { key: string; entries: FlatEntry[] }[] = [];
  for (const entry of shown) {
    const key = monthKey(entry.at);
    const last = months[months.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else months.push({ key, entries: [entry] });
  }

  return (
    <>
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

      {shown.length === 0 && <p className="empty">{emptyLabel}</p>}

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
                    {showProject && <span className="entry-project">{entry.projectName}</span>}
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

      {viewing && (
        <Lightbox images={viewing.images} start={viewing.start} onClose={() => setViewing(null)} />
      )}
    </>
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
