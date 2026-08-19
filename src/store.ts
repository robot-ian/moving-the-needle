import type { DB, Pending, Project } from './types';

const KEY = 'moving-the-needle/v1';
const PENDING_KEY = 'moving-the-needle/pending';
const RIVER_KEY = 'moving-the-needle/river-seen-v2';
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
 * Per project, how far its river had already been drawn last time it was on
 * screen. Used only to decide whether to animate the one advance. It never
 * feeds boat position, which is always the project's session count.
 */
function seenMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RIVER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function loadRiverSeen(projectId: string): number {
  const n = seenMap()[projectId];
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function saveRiverSeen(projectId: string, n: number): void {
  try {
    const map = seenMap();
    if (map[projectId] === n) return;
    map[projectId] = n;
    localStorage.setItem(RIVER_KEY, JSON.stringify(map));
  } catch {
    /* cosmetic only */
  }
}

/** After an import, every boat is already where the data says. Nothing to replay. */
export function markAllRiverSeen(db: DB): void {
  try {
    const map: Record<string, number> = {};
    for (const p of db.projects) map[p.id] = p.log.length;
    localStorage.setItem(RIVER_KEY, JSON.stringify(map));
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
