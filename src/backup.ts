import type { DB } from './types';
import { normalise } from './store';
import { referencedBlobKeys } from './data';
import { allKeys, clearAll, deleteBlob, getBlob, putBlob } from './idb';
import { makeThumb } from './images';
import { isoDateStamp } from './util';

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function exportJson(db: DB): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  download(blob, `moving-the-needle-backup-${isoDateStamp()}.json`);
}

export async function buildZip(db: DB): Promise<Blob> {
  const { zipSync } = await import('fflate');
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};

  files['data.json'] = [new TextEncoder().encode(JSON.stringify(db, null, 2)), { level: 6 }];

  for (const project of db.projects) {
    for (const entry of project.log) {
      for (const att of entry.attachments) {
        if (att.kind !== 'image') continue;
        const blob = await getBlob(att.blobKey);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        // JPEG is already compressed; storing it saves time and produces the same size.
        files[`images/${att.blobKey}.jpg`] = [bytes, { level: 0 }];
      }
    }
  }

  const zipped = zipSync(files);
  const buf = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(buf).set(zipped);
  return new Blob([buf], { type: 'application/zip' });
}

export async function exportZip(db: DB): Promise<void> {
  download(await buildZip(db), `moving-the-needle-backup-${isoDateStamp()}.zip`);
}

export type ImportResult = { db: DB; imagesRestored: number; imagesMissing: number };

async function readZip(file: File): Promise<ImportResult> {
  const { unzipSync } = await import('fflate');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(bytes);

  const json = entries['data.json'];
  if (!json) throw new Error('That zip has no data.json in it.');
  const db = normalise(JSON.parse(new TextDecoder().decode(json)));

  await clearAll();

  let restored = 0;
  let missing = 0;
  for (const project of db.projects) {
    for (const entry of project.log) {
      for (const att of entry.attachments) {
        if (att.kind !== 'image') continue;
        const raw = entries[`images/${att.blobKey}.jpg`];
        if (!raw) {
          missing++;
          continue;
        }
        const buf = new ArrayBuffer(raw.byteLength);
        new Uint8Array(buf).set(raw);
        const blob = new Blob([buf], { type: 'image/jpeg' });
        try {
          await putBlob(att.blobKey, blob);
          // Thumbnails are regenerated rather than carried in the archive.
          await putBlob(att.thumbKey, await makeThumb(blob));
          restored++;
        } catch {
          missing++;
        }
      }
    }
  }
  return { db, imagesRestored: restored, imagesMissing: missing };
}

async function readJson(file: File): Promise<ImportResult> {
  const db = normalise(JSON.parse(await file.text()));
  await clearAll();
  let missing = 0;
  for (const key of referencedBlobKeys(db)) if (key) missing++;
  return { db, imagesRestored: 0, imagesMissing: Math.ceil(missing / 2) };
}

export function importFile(file: File): Promise<ImportResult> {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
  return isZip ? readZip(file) : readJson(file);
}

/** Blobs no log entry points at any more. Run once on load. */
export async function cleanOrphans(db: DB): Promise<void> {
  try {
    const referenced = referencedBlobKeys(db);
    const keys = await allKeys();
    for (const key of keys) if (!referenced.has(key)) await deleteBlob(key);
  } catch {
    /* housekeeping only */
  }
}
