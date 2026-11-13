import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Imagens públicas (produtos, banners). Servidas em /uploads pelo app.
export const PUBLIC_UPLOADS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../storage/public-uploads');
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const SIGNATURES = [
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' }
];

export function detectImageType(buffer) {
  return SIGNATURES.find(s => s.test(buffer)) || null;
}

// Devolve o caminho público relativo ou Data URI em ambiente serverless (Vercel / AWS Lambda)
export async function savePublicImage(buffer, type) {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return `data:${type.mime};base64,${buffer.toString('base64')}`;
  }

  try {
    const relative = `${new Date().getFullYear()}/${crypto.randomUUID()}.${type.ext}`;
    const absolute = path.join(PUBLIC_UPLOADS_ROOT, relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer, { flag: 'wx' });
    return relative;
  } catch (err) {
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      return `data:${type.mime};base64,${buffer.toString('base64')}`;
    }
    throw err;
  }
}
