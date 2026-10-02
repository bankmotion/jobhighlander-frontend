'use client';

/**
 * Shrink a pasted screenshot before it is uploaded.
 *
 * A raw screenshot from a large or high-DPI screen is easily 3 to 8 MB as PNG.
 * The AI vendors scale images down on their side anyway (to roughly 1,500 to
 * 2,000 px on the long edge), so anything larger is upload time and storage
 * that buys nothing. Re-encoded as WebP at high quality, a typical screenshot
 * comes out at 100 to 400 KB with its text still sharp.
 */

/** Longest side, in pixels. */
const MAX_SIDE = 2048;
/** Total pixels, so a very tall capture is not kept at full width. */
const MAX_PIXELS = 4_000_000;
/** Target encoded size. Quality steps down until it fits. */
const TARGET_BYTES = 900_000;

/** Formats both AI vendors accept, worth keeping untouched when already small. */
const KEEP_AS_IS = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface PastedImage {
  dataUrl: string;
  bytes: number;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function shrinkImage(file: Blob): Promise<PastedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_SIDE / Math.max(bitmap.width, bitmap.height),
    Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)),
  );
  // Already small enough and needs no scaling: send it as it is. A flat UI
  // screenshot is often smaller as PNG than re-encoded, and nothing is lost.
  if (scale === 1 && file.size <= TARGET_BYTES && KEEP_AS_IS.has(file.type)) {
    bitmap.close();
    return { dataUrl: await toDataUrl(file), bytes: file.size };
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  // A transparent PNG would otherwise turn black under a lossy format.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let best: Blob | null = null;
  for (const quality of [0.9, 0.8, 0.65, 0.5]) {
    // WebP where the browser can write it; Safari cannot, and hands back a PNG
    // for an unsupported type, so JPEG is asked for there instead.
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (!blob) continue;
    best = blob;
    if (blob.size <= TARGET_BYTES) break;
  }
  if (!best) throw new Error('Could not encode the image');
  return { dataUrl: await toDataUrl(best), bytes: best.size };
}
