// Generates the PWA icons. Run with `npm run icons`. Zero dependencies: PNG is
// written by hand so the app keeps no image toolchain.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const SKY = [0x18, 0x24, 0x30];
const WATER_A = [0x1d, 0x37, 0x46];
const WATER_B = [0x16, 0x2c, 0x38];
const SAIL = [0xdc, 0xcb, 0xa4];
const HULL = [0x8a, 0x5a, 0x34];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgb) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    rgb.copy(raw, rowStart + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function render(size, inset) {
  const s = size;
  const rgb = Buffer.alloc(s * s * 3);
  const put = (x, y, c) => {
    const i = (y * s + x) * 3;
    rgb[i] = c[0];
    rgb[i + 1] = c[1];
    rgb[i + 2] = c[2];
  };

  // Boat and waterline sit inside the safe area so the maskable crop is kind.
  const cx = s / 2;
  const cy = s * 0.62;
  const k = (s / 512) * 1.5 * inset;

  const poly = (pts) => pts.map(([x, y]) => [cx + x * k, cy + y * k]);
  const sail = poly([
    [-4, -30],
    [-4, -140],
    [74, -34],
  ]);
  const mast = poly([
    [-18, -26],
    [-6, -26],
    [-6, -162],
    [-18, -162],
  ]);
  const hull = poly([
    [-104, -22],
    [104, -22],
    [70, 34],
    [-70, 34],
  ]);

  const waterY = cy - 22 * k;
  const bandY = cy + 60 * k;

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      let c = SKY;
      if (y >= waterY) c = WATER_A;
      if (y >= bandY) c = WATER_B;
      if (inside(hull, x, y)) c = HULL;
      else if (inside(sail, x, y) || inside(mast, x, y)) c = SAIL;
      put(x, y, c);
    }
  }
  return encodePng(s, s, rgb);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), render(192, 1));
writeFileSync(join(OUT, 'icon-512.png'), render(512, 1));
writeFileSync(join(OUT, 'icon-maskable-512.png'), render(512, 0.66));
writeFileSync(join(OUT, 'apple-touch-icon.png'), render(180, 1));
console.log('icons written to public/');
