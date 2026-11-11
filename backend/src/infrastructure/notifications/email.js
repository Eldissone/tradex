// E-mail via SMTP (nodemailer). Sem SMTP_HOST, os envios são simulados.
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transport = null;

export function emailConfigured() {
  return Boolean(env.SMTP_HOST);
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
  }
  return transport;
}

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Corpo HTML simples a partir do texto (parágrafos + links)
function toHtml(text) {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${
    text.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join('')
  }<p style="color:#666;font-size:12px">TradeX Global Trading — China ➔ Angola</p></div>`;
}

export async function sendEmail({ to, subject, text }) {
  if (!to) return { status: 'FAILED', error: 'Sem destinatário.' };
  if (!emailConfigured()) return { status: 'SIMULATED', providerMessageId: null };
  try {
    const info = await getTransport().sendMail({ from: env.MAIL_FROM, to, subject, text, html: toHtml(text) });
    return { status: 'SENT', providerMessageId: info.messageId || null };
  } catch (err) {
    return { status: 'FAILED', error: err.message };
  }
}
