import { useState } from 'react';
import type { DB } from '../types';
import type { View } from '../App';
import { createProject } from '../data';
import NextActionField from './NextActionField';

type Props = {
  mutate: (fn: (db: DB) => DB) => DB;
  go: (v: View) => void;
};

/** Creating a project drops straight into a session. There is no other exit. */
export default function NewProject({ mutate, go }: Props) {
  const [name, setName] = useState('');
  const [action, setAction] = useState('');
  const [step, setStep] = useState<'name' | 'action'>('name');

  const start = (nextAction: string) => {
    let id = '';
    mutate((db) => {
      const result = createProject(db, name, nextAction);
      id = result.project.id;
      return result.db;
    });
    go({ name: 'session', projectId: id, floor: false, coldStart: false });
  };

  return (
    <main className="screen narrow">
      <button type="button" className="link back" onClick={() => go({ name: 'home' })}>
        Back
      </button>

      <div className="field">
        <label className="field-label" htmlFor="project-name">
          Name
        </label>
        <input
          id="project-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          autoCapitalize="sentences"
          placeholder="The thing you stopped doing"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) setStep('action');
          }}
        />
        {step === 'name' && (
          <button
            type="button"
            className="btn"
            disabled={!name.trim()}
            onClick={() => setStep('action')}
          >
            Next
          </button>
        )}
      </div>

      {step === 'action' && (
        <NextActionField
          projectName={name}
          label="First next action"
          value={action}
          onChange={setAction}
          onAccept={start}
          submitLabel="Start"
          autoFocus
        />
      )}
    </main>
  );
}
