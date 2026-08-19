import { gerundBase, looksLikeVerb } from './verbs';
import { wordCount } from './util';

export const MAX_NEXT_ACTION = 90;
/** A memory aid, not the load-bearing field. */
export const MIN_DID_WORDS = 2;
/** The load-bearing field. This one does not relax. */
export const MIN_NEXT_ACTION_WORDS = 3;

/**
 * Phrases that name an intention rather than a movement. Matched on word
 * boundaries, so "finished" and "continuous" do not trip the block.
 */
const VAGUE = [
  'continue',
  'keep going',
  'carry on',
  'work on',
  'finish',
  'more on',
  'same as',
  'next steps',
];

const TOO_VAGUE =
  'Too vague. What is the first physical thing you’d touch? Future you has no context.';
const NOT_A_VERB = 'Does that start with a verb? It has to be something you can physically start doing.';
const TOO_SHORT = 'Three words at least — name the thing you’d touch.';
const TOO_LONG = 'Ninety characters. If it does not fit, it is not one action.';

export type Check =
  | { status: 'ok' }
  | { status: 'block'; message: string }
  | { status: 'confirm'; message: string };

export function checkDid(raw: string): Check {
  if (wordCount(raw) < MIN_DID_WORDS) {
    return { status: 'block', message: 'A few more words — what did you actually touch?' };
  }
  return { status: 'ok' };
}

export function checkNextAction(raw: string, projectName: string): Check {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // Vagueness is checked first so "keep going" is answered with the reason that
  // matters, rather than being waved away as a word count.
  for (const phrase of VAGUE) {
    const re = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i');
    if (re.test(lower)) return { status: 'block', message: TOO_VAGUE };
  }

  const name = projectName.trim().toLowerCase();
  if (name && lower === name) return { status: 'block', message: TOO_VAGUE };

  if (wordCount(text) < MIN_NEXT_ACTION_WORDS) return { status: 'block', message: TOO_SHORT };
  if (text.length > MAX_NEXT_ACTION) return { status: 'block', message: TOO_LONG };

  const first = text.split(/\s+/)[0];

  // A gerund describes the work; it is never something you can start doing.
  // Blocked outright rather than merely questioned, because "yes, that is the
  // action" is one tap and this class of entry is always wrong.
  const base = gerundBase(first);
  if (base) {
    return {
      status: 'block',
      message: `Start with the verb itself — “${base}”, not “${first.toLowerCase()}”.`,
    };
  }

  if (!looksLikeVerb(first)) return { status: 'confirm', message: NOT_A_VERB };

  return { status: 'ok' };
}
