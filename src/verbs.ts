/**
 * A next action has to name something you can physically start doing.
 * This list is a heuristic, not a gate: an unrecognised first word only asks
 * for a second tap, it never blocks.
 */
export const ACTION_VERBS: string[] = [
  'add', 'adjust', 'align', 'annotate', 'answer', 'apply', 'archive', 'ask', 'assemble', 'attach',
  'benchmark', 'bend', 'bind', 'book', 'boot', 'breadboard', 'build', 'buy', 'calibrate', 'call',
  'cancel', 'capture', 'chase', 'check', 'clamp', 'clean', 'clear', 'clone', 'close', 'code',
  'collect', 'commit', 'compare', 'compile', 'confirm', 'connect', 'convert', 'copy', 'count', 'crimp',
  'crop', 'cut', 'debug', 'decide', 'delete', 'deploy', 'design', 'diagram', 'dial', 'disassemble',
  'disconnect', 'document', 'download', 'draft', 'draw', 'drill', 'dump', 'edit', 'email', 'enter',
  'erase', 'estimate', 'export', 'extract', 'file', 'fill', 'filter', 'find', 'fit', 'fix',
  'flash', 'flatten', 'fold', 'format', 'frame', 'glue', 'grind', 'hang', 'import', 'improve',
  'index', 'insert', 'inspect', 'install', 'instrument', 'isolate', 'join', 'label', 'lay', 'level',
  'lift', 'list', 'load', 'locate', 'log', 'look', 'make', 'map', 'mark', 'measure',
  'merge', 'message', 'migrate', 'mock', 'model', 'mount', 'move', 'name', 'note', 'open',
  'order', 'outline', 'package', 'paint', 'patch', 'photograph', 'pick', 'pin', 'pitch', 'place',
  'plan', 'plot', 'plug', 'poll', 'post', 'pour', 'power', 'practice', 'practise', 'prepare',
  'press', 'preview', 'print', 'profile', 'prototype', 'prove', 'publish', 'pull', 'push', 'query',
  'read', 'rebuild', 'record', 'redraw', 'refactor', 'reflow', 'register', 'reinstall', 'remove', 'rename',
  'render', 'repair', 'replace', 'reply', 'reproduce', 'rerun', 'research', 'reset', 'resize', 'rewire',
  'rewrite', 'rig', 'roll', 'rough', 'route', 'run', 'sand', 'save', 'scan', 'schedule',
  'screw', 'script', 'seal', 'search', 'send', 'set', 'sew', 'shoot', 'sketch', 'slice',
  'solder', 'sort', 'source', 'spec', 'splice', 'split', 'stack', 'start', 'stitch', 'strip',
  'submit', 'swap', 'switch', 'tag', 'take', 'tape', 'test', 'tidy', 'tighten', 'time',
  'trace', 'train', 'transcribe', 'trim', 'try', 'tune', 'type', 'unpack', 'unplug', 'unscrew',
  'update', 'upgrade', 'upload', 'validate', 'verify', 'video', 'view', 'visit', 'wash', 'watch',
  'weigh', 'weld', 'wind', 'wipe', 'wire', 'write', 'zero', 'zip',
];

const SET = new Set(ACTION_VERBS);

export function looksLikeVerb(firstWord: string): boolean {
  const w = firstWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return false;
  if (SET.has(w)) return true;
  // "re-" variants of listed verbs, e.g. "recheck" from "check".
  if (w.startsWith('re') && SET.has(w.slice(2))) return true;
  return false;
}

/**
 * If the word is provably the -ing form of a verb we know, returns that verb.
 * "making" gives "make"; "wiring" gives "wire"; "running" gives "run".
 *
 * Deliberately narrow. It only fires when stripping -ing lands on a listed
 * verb, so genuine imperatives that happen to end in -ing — ring, bring,
 * string, sing — are left alone and fall through to the ordinary check.
 */
export function gerundBase(firstWord: string): string | null {
  const w = firstWord.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 5 || !w.endsWith('ing')) return null;

  const stem = w.slice(0, -3);
  const candidates = [stem, stem + 'e'];
  // "running" -> "runn" -> "run", "planning" -> "plann" -> "plan"
  if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) {
    candidates.push(stem.slice(0, -1));
  }

  for (const candidate of candidates) if (SET.has(candidate)) return candidate;
  return null;
}
