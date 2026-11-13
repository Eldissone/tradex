import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Ficheiros guardados fora de qualquer pasta servida publicamente
const STORAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../storage/payment-proofs');

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

// Tipo detectado pelos primeiros bytes (não se confia na extensão nem no mimetype do browser)
const SIGNATURES = [
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }
];

export function detectProofType(buffer) {
  return SIGNATURES.find(s => s.test(buffer)) || null;
}

export async function saveProof(buffer, type) {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return `data:${type.mime};base64,${buffer.toString('base64')}`;
  }

  try {
    const relative = `${new Date().getFullYear()}/${crypto.randomUUID()}.${type.ext}`;
    const absolute = path.join(STORAGE_ROOT, relative);
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

export function resolveProofPath(relative) {
  if (relative && relative.startsWith('data:')) {
    return null;
  }
  const absolute = path.resolve(STORAGE_ROOT, relative);
  // Impede sair da pasta de armazenamento
  if (!absolute.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error('INVALID_PROOF_PATH');
  }
  return absolute;
}

export async function deleteProof(relative) {
  if (!relative || relative.startsWith('data:')) return;
  try {
    const p = resolveProofPath(relative);
    if (p) await fs.unlink(p);
  } catch {}
}
