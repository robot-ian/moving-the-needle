/**
 * Photos live here. localStorage holds the text; it cannot hold images and we
 * never base64 them into the JSON blob.
 */
const DB_NAME = 'moving-the-needle-blobs';
const STORE = 'blobs';

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexeddb'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexeddb open failed'));
  });
  dbp.catch(() => {
    dbp = null;
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('indexeddb request failed'));
      }),
  );
}

export function putBlob(key: string, blob: Blob): Promise<void> {
  return tx('readwrite', (s) => s.put(blob, key)).then(() => undefined);
}

export function getBlob(key: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>('readonly', (s) => s.get(key)).catch(() => undefined);
}

export function deleteBlob(key: string): Promise<void> {
  return tx('readwrite', (s) => s.delete(key)).then(
    () => undefined,
    () => undefined,
  );
}

export function allKeys(): Promise<string[]> {
  return tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then(
    (keys) => keys.map(String),
    () => [],
  );
}

export function clearAll(): Promise<void> {
  return tx('readwrite', (s) => s.clear()).then(
    () => undefined,
    () => undefined,
  );
}

/** Approximate bytes held by photos. Display only. */
export async function totalBytes(): Promise<number> {
  try {
    const blobs = await tx<Blob[]>('readonly', (s) => s.getAll());
    return blobs.reduce((n, b) => n + (b?.size ?? 0), 0);
  } catch {
    return 0;
  }
}
