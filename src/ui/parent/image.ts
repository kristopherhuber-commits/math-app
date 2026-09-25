// Shop pictures the parent adds: read the file, scale it to fit `imageMaxPx`, and keep it as a data:
// URL in this device's database. Nothing is uploaded anywhere (R-DATA-3).
import { config } from '../../engine/config';

export async function fileToShopImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not an image');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = config.shop.imageMaxPx;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    // WebP keeps transparency (a coin icon) and stays small; browsers without it return PNG.
    return canvas.toDataURL('image/webp', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
