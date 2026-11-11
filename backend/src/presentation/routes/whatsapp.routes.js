import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { verifyWhatsAppSignature } from '../../infrastructure/notifications/whatsapp.js';
import { handleInboundMessage } from '../../application/whatsapp-conversations.js';

// Webhook da WhatsApp Business Cloud API (Meta)
export const whatsappRouter = Router();

// Verificação do endpoint (configuração na Meta)
whatsappRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (env.WHATSAPP_VERIFY_TOKEN && mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).type('text/plain').send(String(challenge ?? ''));
  }
  return res.sendStatus(403);
});

// Mensagens do mesmo número são tratadas uma de cada vez (o histórico só cresce em ordem)
const queues = new Map();
function enqueue(phone, task) {
  const prev = queues.get(phone) || Promise.resolve();
  const next = prev.then(task, task).catch(err => console.error('[WhatsApp] Falha ao processar mensagem:', err));
  queues.set(phone, next);
  next.finally(() => { if (queues.get(phone) === next) queues.delete(phone); });
  return next;
}

const STATUS_MAP = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };

whatsappRouter.post('/', (req, res) => {
  if (!env.WHATSAPP_APP_SECRET) {
    return res.status(503).json({ ok: false, message: 'Webhook WhatsApp não configurado.' });
  }
  if (!verifyWhatsAppSignature(req.rawBody, req.get('x-hub-signature-256'))) {
    return res.sendStatus(401);
  }

  // A Meta espera 200 rapidamente; o processamento segue em segundo plano
  res.sendStatus(200);

  const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const names = new Map((value.contacts || []).map(c => [c.wa_id, c.profile?.name]));

      for (const msg of value.messages || []) {
        const text = msg.type === 'text'
          ? msg.text?.body
          : msg.type === 'button' ? msg.button?.text
          : msg.type === 'interactive' ? (msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title)
          : `[${msg.type} recebido — o assistente só lê texto]`;
        enqueue(msg.from, () => handleInboundMessage({
          phone: msg.from,
          profileName: names.get(msg.from),
          waMessageId: msg.id,
          text
        }));
      }

      // Recibos de entrega das mensagens enviadas
      for (const st of value.statuses || []) {
        const mapped = STATUS_MAP[st.status];
        if (!mapped || !st.id) continue;
        prisma.conversationMessage.updateMany({ where: { waMessageId: st.id }, data: { deliveryStatus: mapped } }).catch(() => {});
        prisma.notification.updateMany({ where: { providerMessageId: st.id }, data: mapped === 'FAILED' ? { status: 'FAILED', error: st.errors?.[0]?.title || 'Falha na entrega' } : {} }).catch(() => {});
      }
    }
  }
});
