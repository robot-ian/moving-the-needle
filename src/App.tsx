import { useCallback, useEffect, useRef, useState } from 'react';
import type { DB } from './types';
import {
  loadDB,
  loadPending,
  saveDB,
  savePending,
  StorageError,
} from './store';
import { cleanOrphans, exportJson } from './backup';
import Home from './components/Home';
import NewProject from './components/NewProject';
import Session from './components/Session';
import ColdStart from './components/ColdStart';
import CloseOut from './components/CloseOut';
import Log from './components/Log';
import Parking from './components/Parking';
import Settings from './components/Settings';
import ProjectDetail from './components/ProjectDetail';
import { timeOfDay } from './river';

export type View =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'project'; projectId: string }
  | { name: 'session'; projectId: string; floor: boolean; coldStart: boolean }
  | { name: 'coldstart'; projectId: string }
  | { name: 'closeout'; projectId: string; durationMin: number; wasFloor: boolean; wasColdStart: boolean }
  | { name: 'log' }
  | { name: 'parking' }
  | { name: 'settings' };

function initialView(db: DB): View {
  const pending = loadPending();
  if (pending && db.projects.some((p) => p.id === pending.projectId)) {
    return {
      name: 'closeout',
      projectId: pending.projectId,
      durationMin: pending.durationMin,
      wasFloor: pending.wasFloor,
      wasColdStart: pending.wasColdStart,
    };
  }
  if (pending) savePending(null);
  return { name: 'home' };
}

export default function App() {
  const [db, setDb] = useState<DB>(loadDB);
  const [view, setView] = useState<View>(() => initialView(db));
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    void cleanOrphans(db);
    // Once, on load. Later mutations cannot orphan anything the user still needs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every river reads its colours from CSS, so the sky changes with the hour
  // without a single per-card timer. Never with days since anything.
  useEffect(() => {
    const root = document.documentElement;
    const paint = () => {
      root.dataset.tod = timeOfDay(new Date().getHours());
    };
    paint();
    const id = window.setInterval(paint, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // One flag for the whole page: the water pauses while the tab is hidden.
  useEffect(() => {
    const sync = () => document.documentElement.classList.toggle('tab-hidden', document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // Written synchronously on every mutation. The ref keeps the writer honest
  // when two mutations happen in the same tick.
  const dbRef = useRef(db);
  dbRef.current = db;

  const mutate = useCallback((fn: (current: DB) => DB): DB => {
    const next = fn(dbRef.current);
    dbRef.current = next;
    setDb(next);
    try {
      saveDB(next);
    } catch (err) {
      if (err instanceof StorageError) {
        setStorageError('Storage is full, so that change may not have been saved. Export a backup and clear some space.');
      }
    }
    return next;
  }, []);

  const go = useCallback((v: View) => setView(v), []);

  return (
    <div className="app">
      {storageError && (
        <div className="banner" role="status">
          <p>{storageError}</p>
          <div className="banner-row">
            <button
              type="button"
              className="btn-quiet"
              onClick={() => exportJson(db)}
            >
              Export text
            </button>
            <button type="button" className="btn-quiet" onClick={() => setStorageError(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {view.name === 'home' && <Home db={db} go={go} />}
      {view.name === 'new' && <NewProject mutate={mutate} go={go} />}
      {view.name === 'project' && (
        <ProjectDetail db={db} projectId={view.projectId} mutate={mutate} go={go} />
      )}
      {view.name === 'session' && <Session db={db} view={view} mutate={mutate} go={go} />}
      {view.name === 'coldstart' && <ColdStart db={db} projectId={view.projectId} go={go} />}
      {view.name === 'closeout' && (
        <CloseOut db={db} view={view} mutate={mutate} go={go} onStorageError={setStorageError} />
      )}
      {view.name === 'log' && <Log db={db} go={go} />}
      {view.name === 'parking' && <Parking db={db} mutate={mutate} go={go} />}
      {view.name === 'settings' && <Settings db={db} setDb={setDb} mutate={mutate} go={go} />}
    </div>
  );
}
