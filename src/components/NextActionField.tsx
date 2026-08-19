import { useState } from 'react';
import { checkNextAction, MAX_NEXT_ACTION } from '../validate';

type Props = {
  projectName: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAccept: (v: string) => void;
  submitLabel: string;
  autoFocus?: boolean;
};

/**
 * The only input in the app that argues back. A vague entry is refused
 * outright; a first word that does not look like a verb asks once, then yields.
 */
export default function NextActionField({
  projectName,
  label,
  value,
  onChange,
  onAccept,
  submitLabel,
  autoFocus,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const change = (v: string) => {
    onChange(v);
    setMessage(null);
    setAwaitingConfirm(false);
  };

  const submit = () => {
    const result = checkNextAction(value, projectName);
    if (result.status === 'ok') return onAccept(value.trim());
    if (result.status === 'block') {
      setAwaitingConfirm(false);
      setMessage(result.message);
      return;
    }
    if (awaitingConfirm) return onAccept(value.trim());
    setAwaitingConfirm(true);
    setMessage(result.message);
  };

  const left = MAX_NEXT_ACTION - value.length;

  return (
    <div className="field">
      <label className="field-label" htmlFor="next-action">
        {label}
      </label>
      <textarea
        id="next-action"
        className="input input-action"
        value={value}
        onChange={(e) => change(e.target.value)}
        maxLength={MAX_NEXT_ACTION}
        rows={2}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        placeholder="Open the drawer and measure the bracket"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <p className="counter">{left} characters left</p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button type="button" className="btn" onClick={submit}>
        {awaitingConfirm ? 'Yes, that is the action' : submitLabel}
      </button>
    </div>
  );
}
