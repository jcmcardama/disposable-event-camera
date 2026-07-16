// Compresses a raw captured photo before it's saved or uploaded.
// Resizes so the longest side is ~1600px and re-encodes as JPEG at
// ~80% quality, per the spec - keeps files small (faster, more
// reliable uploads on event WiFi) without visible quality loss on
// a phone screen.

const MAX_DIMENSION = 2560;
const JPEG_QUALITY = 0.92;

export async function compressImage(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);

  // Only scale DOWN, never up - a photo already smaller than 1600px
  // on its longest side is left alone.
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const targetWidth = Math.round(bitmap.width * scale);
  const targetHeight = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // If canvas is somehow unavailable, fall back to the original blob
    // rather than losing the photo entirely - reliability over polish.
    return blob;
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close(); // frees the decoded image from memory once drawn

  return new Promise((resolve) => {
    canvas.toBlob(
      (compressedBlob) => resolve(compressedBlob ?? blob),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}