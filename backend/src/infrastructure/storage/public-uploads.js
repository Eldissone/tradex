import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

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

// Envia a imagem diretamente para o bucket do Supabase Storage
async function uploadToSupabaseBucket(buffer, type, relative) {
  const supabaseUrl = env.SUPABASE_URL || 'https://edpqioicmritxugzisha.supabase.co';
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
  const bucket = env.SUPABASE_BUCKET || 'storage';

  if (!supabaseKey) return null;

  try {
    const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}/${relative}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': type.mime,
        'x-upsert': 'true'
      },
      body: buffer
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[TradeX Storage] Falha ao enviar para o Supabase (${res.status}): ${errText}`);
      return null;
    }

    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${relative}`;
  } catch (err) {
    console.warn('[TradeX Storage] Erro de ligação ao Supabase:', err.message);
    return null;
  }
}

// Devolve a URL pública do Supabase, o caminho relativo local ou Data URI em fallback
export async function savePublicImage(buffer, type) {
  const relative = `${new Date().getFullYear()}/${crypto.randomUUID()}.${type.ext}`;

  // 1. Tenta gravar no Bucket Supabase Storage (se a chave estiver configurada)
  const supabasePublicUrl = await uploadToSupabaseBucket(buffer, type, relative);
  if (supabasePublicUrl) {
    return supabasePublicUrl;
  }

  // 2. Se for ambiente serverless (Vercel) e o Supabase não estiver configurado com chave, usa Data URI
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return `data:${type.mime};base64,${buffer.toString('base64')}`;
  }

  // 3. Em ambiente local com disco gravável
  try {
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
