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
  const relative = `${new Date().getFullYear()}/${crypto.randomUUID()}.${type.ext}`;
  const absolute = path.join(STORAGE_ROOT, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer, { flag: 'wx' });
  return relative;
}

export function resolveDocumentPath(relative) {
  const absolute = path.resolve(STORAGE_ROOT, relative);
  if (!absolute.startsWith(STORAGE_ROOT + path.sep)) throw new Error('INVALID_DOCUMENT_PATH');
  return absolute;
}

export async function deleteDocumentFile(relative) {
  if (!relative) return;
  try { await fs.unlink(resolveDocumentPath(relative)); } catch {}
}
