// The image layer. Everything about where pictures come from lives here, so
// swapping base64-in-Firestore for Cloudinary later only touches this file:
// make processPhoto() upload the file and resolve to the hosted URL, and let
// photoSrc() accept https URLs.

import { safeDataImage, safeUrl } from './util.js';

const MAX_SIDE = 800;
// Base64 string length budget. ~180k chars is ~135 KB of image, far below Firestore's 1 MB doc limit.
const MAX_CHARS = 180_000;

export const PLACEHOLDER = 'assets/bottle.svg';

/** The best picture for a perfume: the owner's own photo, then Fragrantica's, then the placeholder. */
export function photoSrc(p) {
  return safeDataImage(p.photo) || safeUrl(p.imageUrl) || PLACEHOLDER;
}

/** <img> markup with lazy loading, no referrer and a cute fallback. */
export function imgTag(p, cls = '') {
  const src = photoSrc(p);
  const alt = `Bottle of ${p.name} by ${p.brand}`;
  return `<img class="${cls}" src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback="${PLACEHOLDER}">`;
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Swap any broken image for the placeholder bottle (error events don't bubble, so capture). */
export function installImageFallback() {
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (img instanceof HTMLImageElement && img.dataset.fallback && !img.src.endsWith(img.dataset.fallback)) {
        img.src = img.dataset.fallback;
        img.classList.add('is-placeholder');
      }
    },
    true,
  );
}

/** Resize and compress a camera/gallery file to a base64 data URL (WebP, JPEG fallback). */
export async function processPhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  let w = Math.round(bitmap.width * scale);
  let h = Math.round(bitmap.height * scale);

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // JPEG has no transparency
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    for (const q of [0.82, 0.72, 0.62, 0.5]) {
      let data = canvas.toDataURL('image/webp', q);
      // Older Safari can't encode WebP and silently returns PNG.
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', q);
      if (data.length <= MAX_CHARS) {
        bitmap.close?.();
        return data;
      }
    }
    w = Math.round(w * 0.8);
    h = Math.round(h * 0.8);
  }
  bitmap.close?.();
  throw new Error('That photo is too detailed to compress. Try another one.');
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> (e.g. HEIC on some browsers) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG or PNG.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
