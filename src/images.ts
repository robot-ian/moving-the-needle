export const FULL_EDGE = 1600;
export const THUMB_EDGE = 320;
export const JPEG_QUALITY = 0.8;

type Source = ImageBitmap | HTMLImageElement;

async function decode(blob: Blob): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('could not read that image'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

function sizeOf(src: Source): { w: number; h: number } {
  const w = 'width' in src ? src.width : 0;
  const h = 'height' in src ? src.height : 0;
  return { w, h };
}

function render(src: Source, longestEdge: number): Promise<Blob> {
  const { w, h } = sizeOf(src);
  const scale = Math.min(1, longestEdge / Math.max(w, h || 1));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('could not read that image'));
  ctx.drawImage(src as CanvasImageSource, 0, 0, cw, ch);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('could not read that image'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

export async function compress(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  const src = await decode(file);
  try {
    const full = await render(src, FULL_EDGE);
    const thumb = await render(src, THUMB_EDGE);
    return { full, thumb };
  } finally {
    if ('close' in src && typeof src.close === 'function') src.close();
  }
}

export async function makeThumb(file: Blob): Promise<Blob> {
  const src = await decode(file);
  try {
    return await render(src, THUMB_EDGE);
  } finally {
    if ('close' in src && typeof src.close === 'function') src.close();
  }
}
