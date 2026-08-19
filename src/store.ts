import type { DB, Pending, Project } from './types';

const KEY = 'moving-the-needle/v1';
const PENDING_KEY = 'moving-the-needle/pending';
const RIVER_KEY = 'moving-the-needle/river-seen';
const PERSIST_KEY = 'moving-the-needle/persist-asked';

export const emptyDB = (): DB => ({ schemaVersion: 1, projects: [], parking: [] });

/** Storage can fail (quota, private mode). One plain message, surfaced once. */
export class StorageError extends Error {}

function reviveProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Project>;
  if (typeof p.id !== 'string' || typeof p.name !== 'string') return null;
  return {
    id: p.id,
    name: p.name,
    nextAction: typeof p.nextAction === 'string' ? p.nextAction : '',
    createdAt: p.createdAt || new Date().toISOString(),
    lastTouchedAt: p.lastTouchedAt || p.createdAt || new Date().toISOString(),
    archived: Boolean(p.archived),
    log: Array.isArray(p.log)
      ? p.log.map((e) => ({ ...e, attachments: Array.isArray(e.attachments) ? e.attachments : [] }))
      : [],
  };
}

export function normalise(raw: unknown): DB {
  if (!raw || typeof raw !== 'object') return emptyDB();
  const d = raw as Partial<DB>;
  return {
    schemaVersion: 1,
    projects: Array.isArray(d.projects)
      ? (d.projects.map(reviveProject).filter(Boolean) as Project[])
      : [],
    parking: Array.isArray(d.parking) ? d.parking.filter((p) => p && typeof p.id === 'string') : [],
  };
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDB();
    return normalise(JSON.parse(raw));
  } catch {
    return emptyDB();
  }
}

export function saveDB(db: DB): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new StorageError('save failed');
  }
}

export function loadPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

export function savePending(p: Pending | null): void {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* a lost pending marker is recoverable; never block the session on it */
  }
}

/**
 * How far the river had already been drawn last time Home was shown. Used only
 * to decide whether to animate the one advance. Never affects boat position.
 */
export function loadRiverSeen(): number {
  try {
    const n = Number(localStorage.getItem(RIVER_KEY));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveRiverSeen(n: number): void {
  try {
    localStorage.setItem(RIVER_KEY, String(n));
  } catch {
    /* cosmetic only */
  }
}

/** Asked once, silently, after the first successful close-out. */
export function requestPersistenceOnce(): void {
  try {
    if (localStorage.getItem(PERSIST_KEY)) return;
    localStorage.setItem(PERSIST_KEY, '1');
    void navigator.storage?.persist?.();
  } catch {
    /* nothing to do */
  }
}

export function totalSessions(db: DB): number {
  return db.projects.reduce((n, p) => n + p.log.length, 0);
}
