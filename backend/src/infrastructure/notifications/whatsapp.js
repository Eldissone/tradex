// WhatsApp Business Cloud API (Meta). Sem credenciais, os envios são simulados.
import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export function whatsappConfigured() {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

// "+244 923 456 789" / "923456789" -> "244923456789" (formato wa_id, sem "+")
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D+/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith('9')) digits = `244${digits}`; // número angolano sem indicativo
  return digits || null;
}

async function callGraph(payload) {
  if (!whatsappConfigured()) {
    return { status: 'SIMULATED', providerMessageId: null };
  }
  const url = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: 'FAILED', error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { status: 'SENT', providerMessageId: data?.messages?.[0]?.id || null };
  } catch (err) {
    return { status: 'FAILED', error: err.message };
  }
}

// Mensagem de texto livre: só é entregue dentro da janela de 24h após a última mensagem do cliente
export function sendWhatsAppText(to, body) {
  const phone = normalizePhone(to);
  if (!phone) return Promise.resolve({ status: 'FAILED', error: 'Número inválido.' });
  return callGraph({ to: phone, type: 'text', text: { preview_url: false, body: body.slice(0, 4000) } });
}

// Modelo aprovado (necessário fora da janela de 24h)
export function sendWhatsAppTemplate(to, name, params) {
  const phone = normalizePhone(to);
  if (!phone) return Promise.resolve({ status: 'FAILED', error: 'Número inválido.' });
  return callGraph({
    to: phone,
    type: 'template',
    template: {
      name,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
      components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: String(text).slice(0, 1000) })) }]
    }
  });
}

// Valida o cabeçalho X-Hub-Signature-256 (HMAC-SHA256 do corpo bruto com o App Secret)
export function verifyWhatsAppSignature(rawBody, header) {
  if (!env.WHATSAPP_APP_SECRET || !rawBody || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex'));
  const provided = Buffer.from(header.slice('sha256='.length));
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
