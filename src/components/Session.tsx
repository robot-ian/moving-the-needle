import { useEffect, useReducer, useRef, useState } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import { addParking } from '../data';
import { savePending } from '../store';
import { clock } from '../util';

const WORK_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const FLOOR_MS = 10 * 60 * 1000;

type Phase = 'work' | 'break';

type Props = {
  db: DB;
  view: Extract<View, { name: 'session' }>;
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
};

export default function Session({ db, view, mutate, go }: Props) {
  const project = db.projects.find((p) => p.id === view.projectId);
  const [, force] = useReducer((n: number) => n + 1, 0);
  const [parked, setParked] = useState('');

  // Blocks are held as an end timestamp, so a locked screen or a backgrounded
  // tab costs nothing.
  const timer = useRef({
    phase: 'work' as Phase,
    floor: view.floor,
    endAt: null as number | null,
    remaining: view.floor ? FLOOR_MS : WORK_MS,
    finishedBlock: false,
    workedMs: 0,
    workingSince: null as number | null,
  });

  const flush = (now: number, keepRunning: boolean) => {
    const t = timer.current;
    if (t.workingSince !== null) {
      t.workedMs += now - t.workingSince;
      t.workingSince = keepRunning && t.phase === 'work' ? now : null;
    } else if (keepRunning && t.phase === 'work') {
      t.workingSince = now;
    }
  };

  const startBlock = () => {
    const t = timer.current;
    const now = Date.now();
    t.endAt = now + t.remaining;
    t.finishedBlock = false;
    flush(now, true);
    force();
  };

  const pause = () => {
    const t = timer.current;
    const now = Date.now();
    if (t.endAt === null) return;
    t.remaining = Math.max(0, t.endAt - now);
    t.endAt = null;
    flush(now, false);
    force();
  };

  const advance = () => {
    const t = timer.current;
    const now = Date.now();
    flush(now, false);
    if (t.floor) {
      // A floor session is one block. When it is over, the timer simply stops.
      t.endAt = null;
      t.remaining = 0;
      t.finishedBlock = true;
      force();
      return;
    }
    t.phase = t.phase === 'work' ? 'break' : 'work';
    t.remaining = t.phase === 'work' ? WORK_MS : BREAK_MS;
    t.endAt = now + t.remaining;
    t.finishedBlock = false;
    flush(now, true);
    force();
  };

  const toFloor = () => {
    const t = timer.current;
    const now = Date.now();
    flush(now, false);
    t.floor = true;
    t.phase = 'work';
    t.remaining = FLOOR_MS;
    t.endAt = now + FLOOR_MS;
    t.finishedBlock = false;
    flush(now, true);
    force();
  };

  const finish = () => {
    const t = timer.current;
    flush(Date.now(), false);
    const durationMin = Math.round(t.workedMs / 60000);
    savePending({
      projectId: view.projectId,
      durationMin,
      wasFloor: t.floor,
      wasColdStart: view.coldStart,
    });
    go({
      name: 'closeout',
      projectId: view.projectId,
      durationMin,
      wasFloor: t.floor,
      wasColdStart: view.coldStart,
    });
  };

  useEffect(() => {
    startBlock();
    const id = window.setInterval(() => {
      const t = timer.current;
      if (t.endAt !== null && Date.now() >= t.endAt) advance();
      else force();
    }, 250);
    const onVisible = () => {
      const t = timer.current;
      if (t.endAt !== null && Date.now() >= t.endAt) advance();
      else force();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!project) go({ name: 'home' });
  }, [project, go]);

  if (!project) return null;

  const t = timer.current;
  const running = t.endAt !== null;
  const left = running ? Math.max(0, (t.endAt as number) - Date.now()) : t.remaining;
  const phaseLabel = t.floor ? 'Floor' : t.phase === 'work' ? 'Work' : 'Break';

  const park = () => {
    if (!parked.trim()) return;
    mutate((current) => addParking(current, view.projectId, parked));
    setParked('');
  };

  return (
    <main className="screen session">
      <p className="session-project">{project.name}</p>
      <p className="session-action">{project.nextAction}</p>

      <div className="timer">
        <p className="timer-phase">{phaseLabel}</p>
        <p className="timer-clock">{t.finishedBlock ? '0:00' : clock(left)}</p>
        <div className="timer-controls">
          {running ? (
            <button type="button" className="btn-quiet" onClick={pause}>
              Pause
            </button>
          ) : (
            <button type="button" className="btn-quiet" onClick={startBlock} disabled={t.finishedBlock}>
              Start
            </button>
          )}
          <button type="button" className="btn-quiet" onClick={advance}>
            Skip block
          </button>
        </div>
      </div>

      <button type="button" className="btn-floor" onClick={toFloor}>
        Floor session — 10 minutes. This counts.
      </button>

      <div className="park">
        <label className="field-label" htmlFor="park-input">
          Parking lot
        </label>
        <input
          id="park-input"
          className="input"
          value={parked}
          onChange={(e) => setParked(e.target.value)}
          placeholder="Park a thought"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              park();
            }
          }}
        />
      </div>

      <button type="button" className="btn" onClick={finish}>
        Finish
      </button>
    </main>
  );
}
