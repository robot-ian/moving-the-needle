/**
 * One boat per project. A boat's position is that project's completed session
 * count and nothing else.
 *
 * Nothing in this file reads a date, a gap, or a session's duration. There is
 * no multiplier anywhere: a ten-minute floor session advances a boat by exactly
 * STEP, and so does a hundred-minute one. Position is `sessions * STEP`, and
 * `sessions` is the length of an append-only log, so it cannot fall.
 */
export const STEP = 34; // world units per completed session, whatever its length
const SLOT = 46; // world units between bank features
const CYCLE = 2800; // world units for one drift through the terrain, about 82 sessions

export type Layer = 'far' | 'near' | 'bank';

export const PARALLAX: Record<Layer, number> = { far: 0.09, near: 0.3, bank: 1 };

export type Feature = { id: number; kind: 'reed' | 'rock' | 'tree' | 'pine'; x: number; j: number };

export type Scene = {
  width: number;
  height: number;
  horizonY: number;
  waterY: number;
  boatX: number;
  boatY: number;
  ridgeFar: string;
  ridgeNear: string;
  bank: string;
  features: Feature[];
  /** Where the boat sat before the most recent session, or null before the first. */
  markerX: number | null;
};

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Wrapped gaussian, so terrain characters fade into each other rather than switch. */
function g(phase: number, centre: number, width: number): number {
  let d = Math.abs(phase - centre);
  if (d > 0.5) d = 1 - d;
  return Math.exp(-(d * d) / (2 * width * width));
}

function phaseAt(world: number): number {
  return (((world / CYCLE) % 1) + 1) % 1;
}

function ridgeHeight(world: number): number {
  const phase = phaseAt(world);
  const amplitude = 2 + 11 * g(phase, 0.62, 0.13) + 21 * g(phase, 0.88, 0.11);
  const shape =
    Math.sin(world * 0.0075) * 0.55 +
    Math.sin(world * 0.019 + 1.7) * 0.3 +
    Math.sin(world * 0.047 + 4.2) * 0.15;
  return amplitude * (0.34 + 0.66 * (shape * 0.5 + 0.5));
}

function featureAt(slot: number): Feature['kind'] | null {
  if (hash(slot * 1.37) > 0.78) return null; // gaps, so the bank is not a fence
  const phase = phaseAt(slot * SLOT);
  const weights: [Feature['kind'], number][] = [
    ['reed', g(phase, 0.06, 0.15)],
    ['rock', g(phase, 0.3, 0.15)],
    ['tree', g(phase, 0.55, 0.15)],
    ['pine', g(phase, 0.8, 0.14)],
  ];
  let best: Feature['kind'] = 'reed';
  let bestScore = -1;
  for (const [kind, weight] of weights) {
    const score = weight * (0.55 + 0.9 * hash(slot * 3.11 + kind.length));
    if (score > bestScore) {
      bestScore = score;
      best = kind;
    }
  }
  return best;
}

/** Extra path drawn past each edge, so the advance slide never exposes a gap. */
function marginFor(layer: Layer): number {
  return Math.ceil(STEP * PARALLAX[layer]) + 12;
}

function ridgePath(
  worldX: number,
  layer: Layer,
  boatX: number,
  width: number,
  baseY: number,
  bottomY: number,
): string {
  const margin = marginFor(layer);
  const parallax = PARALLAX[layer];
  const parts: string[] = [`M ${-margin} ${bottomY}`, `L ${-margin} ${baseY.toFixed(1)}`];
  for (let sx = -margin; sx <= width + margin; sx += 8) {
    const wx = worldX + (sx - boatX) / parallax;
    parts.push(`L ${sx} ${(baseY - ridgeHeight(wx)).toFixed(1)}`);
  }
  parts.push(`L ${width + margin} ${bottomY}`, 'Z');
  return parts.join(' ');
}

function bankPath(worldX: number, boatX: number, width: number, waterY: number): string {
  const margin = marginFor('bank');
  const parts: string[] = [`M ${-margin} ${waterY + 6}`];
  for (let sx = -margin; sx <= width + margin; sx += 10) {
    const wx = worldX + (sx - boatX);
    const y = waterY - 2 + Math.sin(wx * 0.026) * 1.6 + Math.sin(wx * 0.061 + 2) * 0.9;
    parts.push(`L ${sx} ${y.toFixed(1)}`);
  }
  parts.push(`L ${width + margin} ${waterY + 6}`, 'Z');
  return parts.join(' ');
}

export function buildScene(sessions: number, width: number, height: number): Scene {
  const worldX = sessions * STEP;
  const boatX = Math.round(width * 0.34);
  const horizonY = height * 0.44;
  const waterY = Math.round(height * 0.58);
  const boatY = waterY + (height - waterY) * 0.42;

  const margin = marginFor('bank');
  const features: Feature[] = [];
  const first = Math.floor((worldX - boatX - margin) / SLOT);
  const last = Math.ceil((worldX + width - boatX + margin) / SLOT);
  for (let slot = first; slot <= last; slot++) {
    const kind = featureAt(slot);
    if (!kind) continue;
    const wx = slot * SLOT + hash(slot * 7.7) * 22;
    features.push({ id: slot, kind, x: boatX + (wx - worldX), j: hash(slot * 5.3) });
  }

  return {
    width,
    height,
    horizonY,
    waterY,
    boatX,
    boatY,
    ridgeFar: ridgePath(worldX, 'far', boatX, width, horizonY - 2, waterY + 2),
    ridgeNear: ridgePath(worldX, 'near', boatX, width, horizonY + 7, waterY + 2),
    bank: bankPath(worldX, boatX, width, waterY),
    features,
    markerX: sessions >= 1 ? boatX - STEP : null,
  };
}

/** The water tiles every WAVE units, so a translate of that much loops seamlessly. */
export const WAVE = 60;

export function waterPath(width: number, height: number, top: number, phase: number): string {
  const parts: string[] = [`M ${-WAVE - 6} ${height + 6}`];
  for (let sx = -WAVE - 6; sx <= width + WAVE + 6; sx += 6) {
    const a = (sx / WAVE) * Math.PI * 2;
    const y = top + Math.sin(a + phase) * 1.3 + Math.sin(a * 2 + phase * 1.7) * 0.7;
    parts.push(`L ${sx} ${y.toFixed(1)}`);
  }
  parts.push(`L ${width + WAVE + 6} ${height + 6}`, 'Z');
  return parts.join(' ');
}

export type CurrentLine = { x: number; y: number; len: number };

/** Drifting surface lines. Static geometry; the motion is one CSS translate. */
export function currentLines(width: number, height: number, waterY: number): CurrentLine[][] {
  const groups: CurrentLine[][] = [[], [], []];
  for (let i = 0; i < 6; i++) {
    const band = i % 3;
    groups[band].push({
      x: hash(i * 2.3) * width,
      y: waterY + 5 + hash(i * 4.1) * (height - waterY - 7),
      len: 10 + hash(i * 6.7) * 18,
    });
  }
  return groups;
}

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}
