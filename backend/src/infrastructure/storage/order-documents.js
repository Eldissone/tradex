import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProofType } from './payment-proofs.js';

// Documentos de encomenda: fora de qualquer pasta pública, só servidos com verificação de acesso
const STORAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../storage/order-documents');

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const detectDocumentType = detectProofType; // PDF, JPG ou PNG, pelo conteúdo

export async function saveDocument(buffer, type) {
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

export function resolveDocumentPath(relative) {
  if (relative && relative.startsWith('data:')) return null;
  const absolute = path.resolve(STORAGE_ROOT, relative);
  if (!absolute.startsWith(STORAGE_ROOT + path.sep)) throw new Error('INVALID_DOCUMENT_PATH');
  return absolute;
}

export async function deleteDocumentFile(relative) {
  if (!relative || relative.startsWith('data:')) return;
  try {
    const p = resolveDocumentPath(relative);
    if (p) await fs.unlink(p);
  } catch {}
}
