// Notificações ao cliente (WhatsApp + e-mail) nos marcos da encomenda.
// Nunca lança erro para quem chama: falhas ficam registadas na tabela Notification.
import { prisma } from '../database/prisma.js';
import { env } from '../../config/env.js';
import { getSetting } from '../settings.js';
import { ORDER_STATUS_LABELS } from '../../presentation/serializers.js';
import { sendWhatsAppText, sendWhatsAppTemplate, normalizePhone } from './whatsapp.js';
import { sendEmail } from './email.js';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const kz = (v) => `${Number(v || 0).toLocaleString('pt-AO')} Kz`;
const siteUrl = () => (env.PUBLIC_SITE_URL || env.CORS_ORIGIN).replace(/\/$/, '');

async function bankLines() {
  const bank = await getSetting('bank');
  return (bank.accounts || []).map(a => `${a.bank}: ${a.iban}`).join('\n');
}

// Texto curto (WhatsApp) e assunto (e-mail) por evento
async function buildMessage(order, event, extra = {}) {
  const first = order.customerName.split(/\s+/)[0];
  const track = `${siteUrl()}/rastreio?codigo=${encodeURIComponent(order.number)}`;

  switch (event) {
    case 'order_created':
      return {
        subject: `Encomenda ${order.number} registada`,
        summary: `Encomenda registada. Total ${kz(order.totalAoa)}. Aguardamos a transferência.`,
        text: `Olá ${first}, recebemos a sua encomenda ${order.number}.\n\nTotal a pagar: ${kz(order.totalAoa)}\n\nTransfira para:\n${await bankLines()}\n\nIndique ${order.number} no descritivo e envie o comprovativo em:\n${track}`
      };
    case 'proof_received':
      return {
        subject: `Comprovativo recebido — ${order.number}`,
        summary: 'Comprovativo recebido. A tesouraria vai validar o pagamento.',
        text: `Olá ${first}, recebemos o comprovativo da encomenda ${order.number}. A nossa tesouraria valida normalmente em até 2 horas úteis.\n\nAcompanhe aqui: ${track}`
      };
    case 'payment_approved':
      return {
        subject: `Pagamento confirmado — ${order.number}`,
        summary: 'Pagamento confirmado. Vamos avançar com a compra na China.',
        text: `Olá ${first}, o pagamento da encomenda ${order.number} foi confirmado. Vamos avançar com a compra junto do fornecedor na China.\n\nAcompanhe aqui: ${track}`
      };
    case 'payment_declined':
      return {
        subject: `Comprovativo não validado — ${order.number}`,
        summary: `Comprovativo não validado: ${extra.reason || 'contacte-nos'}.`,
        text: `Olá ${first}, não conseguimos validar o comprovativo da encomenda ${order.number}.\nMotivo: ${extra.reason || 'não indicado'}.\n\nPode enviar um novo comprovativo em: ${track}`
      };
    case 'status_changed': {
      const label = ORDER_STATUS_LABELS[order.status] || order.status;
      const pickup = order.status === 'READY_FOR_PICKUP' ? '\n\nPode levantar no Terminal TradeX, Bairro Azul, Luanda.' : '';
      return {
        subject: `${order.number}: ${label}`,
        summary: `${label}.${extra.note ? ` ${extra.note}` : ''}`,
        text: `Olá ${first}, a sua encomenda ${order.number} está agora: ${label}.${extra.note ? `\n${extra.note}` : ''}${pickup}\n\nAcompanhe aqui: ${track}`
      };
    }
    case 'manual':
      return {
        subject: `TradeX — ${order.number}`,
        summary: extra.message,
        text: `Olá ${first}, ${extra.message}\n\nEncomenda ${order.number}: ${track}`
      };
    default:
      return null;
  }
}

async function record(data) {
  try {
    await prisma.notification.create({ data });
  } catch (err) {
    console.error('[Notificações] Não foi possível registar:', err.message);
  }
}

// Janela de 24h do WhatsApp: o cliente escreveu-nos há menos de 24h?
async function insideWhatsAppWindow(phone) {
  const convo = await prisma.conversation.findUnique({ where: { phone }, select: { lastMessageAt: true } });
  return Boolean(convo && Date.now() - convo.lastMessageAt.getTime() < WINDOW_MS);
}

async function sendWhatsAppForOrder(order, event, msg) {
  const phone = normalizePhone(order.customerPhone);
  if (!phone) return;

  let result;
  if ((await insideWhatsAppWindow(phone)) || !env.WHATSAPP_TEMPLATE_ORDER_UPDATE) {
    result = await sendWhatsAppText(phone, msg.text);
  } else {
    result = await sendWhatsAppTemplate(phone, env.WHATSAPP_TEMPLATE_ORDER_UPDATE, [
      order.customerName.split(/\s+/)[0], order.number, msg.summary
    ]);
  }

  await record({
    orderId: order.id, channel: 'WHATSAPP', recipient: phone, event,
    body: msg.text, status: result.status, providerMessageId: result.providerMessageId || null, error: result.error || null
  });

  // Fica também na conversa, se existir, para a equipa ver o histórico completo
  const convo = await prisma.conversation.findUnique({ where: { phone }, select: { id: true } });
  if (convo) {
    await prisma.conversationMessage.create({
      data: { conversationId: convo.id, direction: 'OUT', author: 'SYSTEM', text: msg.text, waMessageId: result.providerMessageId || null, deliveryStatus: result.status }
    }).catch(() => {});
  }
}

export async function notifyOrderEvent(orderId, event, extra = {}) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const msg = await buildMessage(order, event, extra);
    if (!msg) return;

    const emailResult = await sendEmail({ to: order.customerEmail, subject: msg.subject, text: msg.text });
    await record({
      orderId: order.id, channel: 'EMAIL', recipient: order.customerEmail, event,
      subject: msg.subject, body: msg.text, status: emailResult.status,
      providerMessageId: emailResult.providerMessageId || null, error: emailResult.error || null
    });

    await sendWhatsAppForOrder(order, event, msg);
  } catch (err) {
    console.error(`[Notificações] Falha em ${event}:`, err.message);
  }
}

export async function sendPasswordResetEmail(email, link) {
  const text = `Recebemos um pedido para redefinir a palavra-passe da sua conta TradeX.\n\nAbra este link (válido durante 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail.`;
  const result = await sendEmail({ to: email, subject: 'Redefinir palavra-passe — TradeX', text });
  await record({
    channel: 'EMAIL', recipient: email, event: 'password_reset', subject: 'Redefinir palavra-passe',
    body: text.replace(link, '[link]'), status: result.status, error: result.error || null
  });
  return result;
}
