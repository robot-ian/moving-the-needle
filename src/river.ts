/**
 * One boat, for everything you do. Its position is sessions * STEP and nothing
 * else. Nothing in this file reads a date, a gap, or a session's duration.
 */
export const STEP = 140; // world units gained per completed session, whatever its length
const SLOT = 96; // world units between bank features
const CYCLE = 22000; // world units for one full drift through the terrain

export type Palette = {
  sky: string;
  ridgeFar: string;
  ridgeNear: string;
  bank: string;
  veg: string;
  stone: string;
  water: [string, string, string];
  hull: string;
  sail: string;
};

const NIGHT: Palette = {
  sky: '#243349',
  ridgeFar: '#1b2a3d',
  ridgeNear: '#131f2e',
  bank: '#0d1721',
  veg: '#2f4038',
  stone: '#2a343f',
  water: ['#14303f', '#1a3b4c', '#0f2634'],
  hull: '#a06a3c',
  sail: '#ece0c2',
};

export function paletteFor(hour: number): Palette {
  if (hour >= 5 && hour < 8) {
    return {
      ...NIGHT,
      sky: '#3b3b55',
      ridgeFar: '#2e3049',
      ridgeNear: '#22253e',
      bank: '#181c30',
      veg: '#334040',
      stone: '#2f3548',
      water: ['#1e3446', '#264257', '#182c3c'],
    };
  }
  if (hour >= 8 && hour < 17) {
    return {
      ...NIGHT,
      sky: '#4a6a8a',
      ridgeFar: '#3a5670',
      ridgeNear: '#2b4157',
      bank: '#1f3143',
      veg: '#3d5647',
      stone: '#3a4a58',
      water: ['#20455a', '#2a5570', '#193949'],
    };
  }
  if (hour >= 17 && hour < 20) {
    return {
      ...NIGHT,
      sky: '#2f3048',
      ridgeFar: '#242840',
      ridgeNear: '#191e32',
      bank: '#121627',
      veg: '#2c3a38',
      stone: '#282f3e',
      water: ['#182f3e', '#1f3c4f', '#122735'],
    };
  }
  return NIGHT;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Wrapped gaussian: terrain characters fade into each other, never switch. */
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
  const amplitude = 4 + 26 * g(phase, 0.62, 0.13) + 54 * g(phase, 0.88, 0.11);
  const shape =
    Math.sin(world * 0.0013) * 0.55 +
    Math.sin(world * 0.0037 + 1.7) * 0.3 +
    Math.sin(world * 0.0091 + 4.2) * 0.15;
  return amplitude * (0.34 + 0.66 * (shape * 0.5 + 0.5));
}

type Feature = 'reed' | 'rock' | 'tree' | 'pine';

function featureAt(slot: number): Feature | null {
  if (hash(slot * 1.37) > 0.8) return null; // gaps, so the bank is not a fence
  const phase = phaseAt(slot * SLOT);
  const weights: [Feature, number][] = [
    ['reed', g(phase, 0.06, 0.15)],
    ['rock', g(phase, 0.3, 0.15)],
    ['tree', g(phase, 0.55, 0.15)],
    ['pine', g(phase, 0.8, 0.14)],
  ];
  let best: Feature = 'reed';
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

export type Scene = {
  width: number;
  height: number;
  /** Boat position in world units. Only ever increases. */
  worldX: number;
  /** Seconds, for water and bob. Cosmetic only. */
  time: number;
  /** 0 to 1, the one advance animation. */
  ripple: number;
  still: boolean;
  palette: Palette;
};

export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { width, height, worldX, time, ripple, still, palette } = scene;
  const boatX = width * 0.34;
  const horizonY = Math.round(height * 0.46);
  const waterY = Math.round(height * 0.58);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, width, height);

  const ridge = (parallax: number, colour: string, lift: number) => {
    ctx.beginPath();
    ctx.moveTo(-4, horizonY + lift);
    for (let sx = -4; sx <= width + 4; sx += 5) {
      const wx = worldX + (sx - boatX) / parallax;
      ctx.lineTo(sx, horizonY + lift - ridgeHeight(wx));
    }
    ctx.lineTo(width + 4, waterY + 2);
    ctx.lineTo(-4, waterY + 2);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  };
  ridge(0.09, palette.ridgeFar, -2);
  ridge(0.3, palette.ridgeNear, 9);

  ctx.fillStyle = palette.bank;
  ctx.beginPath();
  ctx.moveTo(-4, waterY + 4);
  for (let sx = -4; sx <= width + 4; sx += 7) {
    const wx = worldX + (sx - boatX);
    ctx.lineTo(sx, waterY - 3 + Math.sin(wx * 0.009) * 2.2 + Math.sin(wx * 0.021 + 2) * 1.1);
  }
  ctx.lineTo(width + 4, waterY + 5);
  ctx.lineTo(-4, waterY + 5);
  ctx.closePath();
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const first = Math.floor((worldX + (-40 - boatX)) / SLOT);
  const last = Math.ceil((worldX + (width + 40 - boatX)) / SLOT);
  for (let slot = first; slot <= last; slot++) {
    const kind = featureAt(slot);
    if (!kind) continue;
    const wx = slot * SLOT + hash(slot * 7.7) * 40;
    drawFeature(ctx, kind, boatX + (wx - worldX), waterY - 2, hash(slot * 5.3), palette);
  }

  // Water: flat bands, drifting left because the boat is going up it.
  const bandTop = waterY + 3;
  const bandHeight = (height - bandTop) / 3;
  const speeds = [10, 17, 25];
  for (let b = 0; b < 3; b++) {
    const top = bandTop + b * bandHeight;
    ctx.fillStyle = palette.water[b];
    ctx.beginPath();
    ctx.moveTo(-4, top + 4);
    for (let sx = -4; sx <= width + 4; sx += 6) {
      const p = (sx + time * speeds[b]) * 0.06 + b * 2.1;
      ctx.lineTo(sx, top + Math.sin(p) * 1.5 + Math.sin(p * 0.41) * 1.1);
    }
    ctx.lineTo(width + 4, height + 4);
    ctx.lineTo(-4, height + 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.075)';
  ctx.lineWidth = 1;
  const span = width + 80;
  for (let i = 0; i < 7; i++) {
    const speed = 12 + (i % 3) * 9;
    const y = bandTop + 7 + ((i * 13.7) % Math.max(1, height - bandTop - 9));
    const len = 16 + hash(i) * 26;
    const x = (((hash(i * 2.3) * span - time * speed) % span) + span) % span - 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }

  const bob = still ? 0 : Math.sin(time * 1.15) * 1.6 + Math.sin(time * 0.63) * 0.9;
  const boatY = bandTop + (height - bandTop) * 0.4 + bob;

  if (ripple > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.16 * ripple})`;
    for (let i = 0; i < 3; i++) {
      const r = 8 + i * 9 + (1 - ripple) * 22;
      ctx.beginPath();
      ctx.ellipse(boatX - 16, boatY + 5, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawBoat(ctx, boatX, boatY, still ? 0 : Math.sin(time * 0.9) * 0.02, palette);
}

function drawFeature(
  ctx: CanvasRenderingContext2D,
  kind: Feature,
  x: number,
  base: number,
  jitter: number,
  palette: Palette,
): void {
  ctx.fillStyle = kind === 'rock' ? palette.stone : palette.veg;
  ctx.strokeStyle = kind === 'rock' ? palette.stone : palette.veg;

  if (kind === 'reed') {
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      const h = 11 + jitter * 10 + i * 2.5;
      const dx = x + i * 3.5 - 5;
      ctx.beginPath();
      ctx.moveTo(dx, base + 1);
      ctx.quadraticCurveTo(dx + 2, base - h * 0.6, dx + 5 + jitter * 3, base - h);
      ctx.stroke();
    }
    return;
  }

  if (kind === 'rock') {
    const w = 12 + jitter * 14;
    const h = 7 + jitter * 9;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, base + 1);
    ctx.lineTo(x - w * 0.26, base - h);
    ctx.lineTo(x + w * 0.14, base - h * 0.78);
    ctx.lineTo(x + w / 2, base + 1);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (kind === 'tree') {
    const h = 22 + jitter * 16;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, base + 1);
    ctx.lineTo(x, base - h * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, base - h * 0.76, 8 + jitter * 5, 7 + jitter * 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const h = 26 + jitter * 20;
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  ctx.lineTo(x + 7 + jitter * 3, base + 1);
  ctx.lineTo(x - 7 - jitter * 3, base + 1);
  ctx.closePath();
  ctx.fill();
}

function drawBoat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt: number,
  palette: Palette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.fillStyle = palette.sail;
  ctx.beginPath();
  ctx.moveTo(-1, -7);
  ctx.lineTo(-1, -23);
  ctx.lineTo(11, -8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = palette.sail;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, -5);
  ctx.lineTo(-3, -25);
  ctx.stroke();

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(-15, -6);
  ctx.lineTo(15, -6);
  ctx.lineTo(10, 3);
  ctx.lineTo(-10, 3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
