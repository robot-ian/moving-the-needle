import type { Attachment, DB, LogEntry, Project } from './types';
import { uid } from './util';

/**
 * nextAction is written in exactly three places in this codebase, all below:
 * createProject, closeOut, and correctNextAction. There is no fourth.
 *
 * correctNextAction is a correction window, not an edit button. It refuses
 * unless the action was written within the last 24 hours and no session has
 * been completed since. The check lives here rather than only in the UI, so
 * hiding or showing a pencil cannot widen it. See the README.
 */

export const CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

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

/**
 * When the current nextAction was written: at the close-out that set it, or at
 * creation for a project with no sessions yet. A correction deliberately does
 * not move this, so correcting cannot roll the window forward indefinitely.
 */
export function nextActionSetAt(project: Project): string {
  return project.log.length ? project.log[project.log.length - 1].at : project.createdAt;
}

export function sessionsSinceNextActionSet(project: Project): number {
  const at = nextActionSetAt(project);
  return project.log.filter((e) => e.at > at).length;
}

export function canCorrectNextAction(project: Project, now: number = Date.now()): boolean {
  if (sessionsSinceNextActionSet(project) > 0) return false;
  const setAt = new Date(nextActionSetAt(project)).getTime();
  if (!Number.isFinite(setAt)) return false;
  const elapsed = now - setAt;
  return elapsed >= 0 && elapsed < CORRECTION_WINDOW_MS;
}

/** Refuses outside the window. Writes no log entry and does not touch lastTouchedAt. */
export function correctNextAction(db: DB, projectId: string, text: string): DB {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project || !canCorrectNextAction(project)) return db;
  const trimmed = text.trim();
  if (!trimmed) return db;
  return {
    ...db,
    projects: db.projects.map((p) => (p.id === projectId ? { ...p, nextAction: trimmed } : p)),
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
