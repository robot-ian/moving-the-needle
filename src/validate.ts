import { looksLikeVerb } from './verbs';
import { wordCount } from './util';

export const MAX_NEXT_ACTION = 90;

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

const TOO_VAGUE = 'Too vague. What is the first physical thing you would touch? Future you has no context.';
const NOT_A_VERB = 'Does that start with a verb? It has to be something you can physically start doing.';

export type NextActionCheck =
  | { status: 'ok' }
  | { status: 'block'; message: string }
  | { status: 'confirm'; message: string };

export function checkNextAction(raw: string, projectName: string): NextActionCheck {
  const text = raw.trim();

  if (wordCount(text) < 3) {
    return { status: 'block', message: 'At least three words. Name the thing you would touch.' };
  }
  if (text.length > MAX_NEXT_ACTION) {
    return {
      status: 'block',
      message: 'Ninety characters. If it does not fit, it is not one action.',
    };
  }

  const lower = text.toLowerCase();
  for (const phrase of VAGUE) {
    const re = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i');
    if (re.test(lower)) return { status: 'block', message: TOO_VAGUE };
  }

  const name = projectName.trim().toLowerCase();
  if (name && lower === name) return { status: 'block', message: TOO_VAGUE };

  if (!looksLikeVerb(text.split(/\s+/)[0])) return { status: 'confirm', message: NOT_A_VERB };

  return { status: 'ok' };
}
