import type { Attachment, DB, LogEntry, Project } from './types';
import { uid } from './util';

/**
 * nextAction is written in exactly two places in this codebase: createProject
 * and closeOut, both below. There is no third. See the README.
 */

export function createProject(db: DB, name: string, nextAction: string): { db: DB; project: Project } {
  const now = new Date().toISOString();
  const project: Project = {
    id: uid(),
    name: name.trim(),
    nextAction: nextAction.trim(),
    createdAt: now,
    lastTouchedAt: now,
    archived: false,
    log: [],
  };
  return { db: { ...db, projects: [...db.projects, project] }, project };
}

export type CloseOutInput = {
  projectId: string;
  did: string;
  broke: string;
  nextAction: string;
  durationMin: number;
  wasFloor: boolean;
  wasColdStart: boolean;
  attachments: Attachment[];
};

export function closeOut(db: DB, input: CloseOutInput): DB {
  const now = new Date().toISOString();
  const entry: LogEntry = {
    id: uid(),
    at: now,
    did: input.did.trim(),
    broke: input.broke.trim(),
    nextAction: input.nextAction.trim(),
    durationMin: input.durationMin,
    wasFloor: input.wasFloor,
    wasColdStart: input.wasColdStart,
    attachments: input.attachments,
  };
  return {
    ...db,
    projects: db.projects.map((p) =>
      p.id === input.projectId
        ? {
            ...p,
            nextAction: entry.nextAction,
            lastTouchedAt: now,
            log: [...p.log, entry],
          }
        : p,
    ),
  };
}

export function renameProject(db: DB, id: string, name: string): DB {
  const trimmed = name.trim();
  if (!trimmed) return db;
  return { ...db, projects: db.projects.map((p) => (p.id === id ? { ...p, name: trimmed } : p)) };
}

export function setArchived(db: DB, id: string, archived: boolean): DB {
  return { ...db, projects: db.projects.map((p) => (p.id === id ? { ...p, archived } : p)) };
}

export function addParking(db: DB, projectId: string | null, text: string): DB {
  const trimmed = text.trim();
  if (!trimmed) return db;
  return {
    ...db,
    parking: [
      ...db.parking,
      { id: uid(), at: new Date().toISOString(), projectId, text: trimmed, resolved: false },
    ],
  };
}

export function setParkingResolved(db: DB, id: string, resolved: boolean): DB {
  return { ...db, parking: db.parking.map((p) => (p.id === id ? { ...p, resolved } : p)) };
}

export type FlatEntry = LogEntry & { projectId: string; projectName: string };

/** Every entry ever written, newest first. Archived projects included. */
export function allEntries(db: DB): FlatEntry[] {
  const out: FlatEntry[] = [];
  for (const p of db.projects) {
    for (const e of p.log) out.push({ ...e, projectId: p.id, projectName: p.name });
  }
  out.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}

export function referencedBlobKeys(db: DB): Set<string> {
  const keys = new Set<string>();
  for (const p of db.projects) {
    for (const e of p.log) {
      for (const a of e.attachments) {
        if (a.kind === 'image') {
          keys.add(a.blobKey);
          keys.add(a.thumbKey);
        }
      }
    }
  }
  return keys;
}
