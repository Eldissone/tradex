import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma.js';
import { getShippingMode } from '../../config/shipping.js';
import { z } from 'zod';
import { ORDER_STATUS_LABELS } from '../serializers.js';
import { optionalAuth, isStaff } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import { resolveDocumentPath } from '../../infrastructure/storage/order-documents.js';

const lookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

export const trackingRouter = Router();

// Sessão do dono, sessão de staff ou e-mail da compra
function canAccessOrder(order, user, email) {
  return Boolean(order && (
    (user && (isStaff(user) || (user.customer && order.customerId === user.customer.id) || order.customerEmail === user.email)) ||
    (email && order.customerEmail === email)
  ));
}

// Ordem das etapas visíveis ao cliente
const STEPS = [
  { key: 'PAYMENT_CONFIRMED', label: 'Pagamento Confirmado' },
  { key: 'PROCESSING_SUPPLIER', label: 'Em Processamento (China)' },
  { key: 'IN_INTERNATIONAL_TRANSIT', label: 'Enviado' },
  { key: 'ARRIVED_IN_ANGOLA', label: 'Chegou a Angola' },
  { key: 'FINAL', label: 'Entregue' }
];

const STATUS_STEP_INDEX = {
  AWAITING_PAYMENT: 0,
  PAYMENT_CONFIRMED: 1,
  PROCESSING_SUPPLIER: 1,
  IN_INTERNATIONAL_TRANSIT: 2,
  ARRIVED_IN_ANGOLA: 3,
  READY_FOR_PICKUP: 4,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  CANCELLED: 0,
  RETURNED: 0
};

const STATUS_CLASS = {
  AWAITING_PAYMENT: 'status-pending',
  READY_FOR_PICKUP: 'status-ready',
  DELIVERED: 'status-ready',
  OUT_FOR_DELIVERY: 'status-cleared',
  CANCELLED: 'status-pending'
};

const fmtDate = (d) =>
  new Date(d).toLocaleString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Rastreio por código da encomenda.
// Os números são sequenciais, por isso exige-se um segundo factor:
// sessão do dono, sessão de staff, ou o e-mail usado na compra (no corpo do pedido, nunca na URL).
const lookupSchema = z.object({
  code: z.string().trim().min(1).max(40),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('').transform(() => undefined))
});

const NOT_FOUND = 'Não encontrámos nenhuma encomenda com este código e e-mail.';

trackingRouter.post('/lookup', lookupLimiter, optionalAuth, async (req, res) => {
  const { code: rawCode, email } = lookupSchema.parse(req.body || {});
  const code = rawCode.toUpperCase();
  const order = await prisma.order.findUnique({
    where: { number: code },
    include: { trackingEvents: { orderBy: { occurredAt: 'desc' } }, items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 }, documents: { orderBy: { createdAt: 'asc' } } }
  });

  const user = req.user;
  const allowed = canAccessOrder(order, user, email);

  // Mesma resposta para "não existe" e "e-mail errado" (não revela que o código existe)
  if (!allowed) {
    return res.status(404).json({ ok: false, needsEmail: !user || !email, message: NOT_FOUND });
  }

  const mode = getShippingMode(order.shippingMode);
  const stepIdx = STATUS_STEP_INDEX[order.status] ?? 0;
  const lastStepLabel =
    order.status === 'READY_FOR_PICKUP' ? 'Pronto p/ Levantamento' :
    order.status === 'OUT_FOR_DELIVERY' ? 'Em Entrega' : 'Entregue';

  const milestones = STEPS.map((s, i) => ({
    step: i + 1,
    label: i === 4 ? lastStepLabel : s.label,
    done: i < stepIdx,
    active: i === stepIdx || (i === 4 && stepIdx >= 4),
    pending: i > stepIdx
  }));

  const address = order.deliveryAddress;
  const lastEvent = order.trackingEvents[0];

  return res.json({
    ok: true,
    data: {
      code: order.number,
      mode: mode.longLabel,
      modeType: order.shippingMode === 'air_exp' ? 'air' : 'sea',
      status: ORDER_STATUS_LABELS[order.status],
      statusKey: order.status,
      // Estado do pagamento (sem dados pessoais) para o convidado poder enviar o comprovativo
      payment: order.payments[0]
        ? { status: order.payments[0].status, rejectionReason: order.payments[0].rejectionReason, totalAoa: Number(order.totalAoa) }
        : null,
      statusClass: STATUS_CLASS[order.status] || 'status-transit',
      progress: Math.min(100, Math.round((stepIdx / 5) * 100)),
      origin: 'Guangzhou, China',
      destination: 'Luanda, Angola',
      finalDelivery: order.deliveryMethod === 'pickup'
        ? 'Terminal TradeX, Bairro Azul, Luanda'
        : `${address?.municipality || ''}${address?.province ? `, ${address.province}` : ''}`,
      departureDate: order.trackingEvents.find(e => e.status === 'IN_INTERNATIONAL_TRANSIT')
        ? fmtDate(order.trackingEvents.find(e => e.status === 'IN_INTERNATIONAL_TRANSIT').occurredAt)
        : 'A agendar',
      estimatedArrival: order.estimatedDelivery || `${mode.minDays} a ${mode.maxDays} dias`,
      volumeWeight: `${order.items.reduce((a, i) => a + i.quantity, 0)} unidade(s)`,
      lastUpdate: lastEvent ? fmtDate(lastEvent.occurredAt) : fmtDate(order.updatedAt),
      currentLocation: lastEvent?.location || ORDER_STATUS_LABELS[order.status],
      milestones,
      timeline: order.trackingEvents.map((e, i) => ({
        date: fmtDate(e.occurredAt),
        title: e.label,
        location: e.location || '',
        detail: e.note || '',
        badge: i === 0 ? 'Mais recente' : 'Concluído',
        badgeClass: i === 0 ? 'badge-transit' : 'badge-done'
      })),
      documents: order.documents.map(d => ({
        id: d.id, name: d.name, fileName: d.fileName, mimeType: d.mimeType, size: d.size, createdAt: d.createdAt
      }))
    }
  });
});

// Ficheiro de um documento da encomenda. POST para o e-mail não ir na URL.
const docFileSchema = z.object({
  code: z.string().trim().min(1).max(40),
  documentId: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('').transform(() => undefined))
});

trackingRouter.post('/documents/file', lookupLimiter, optionalAuth, async (req, res) => {
  const { code, documentId, email } = docFileSchema.parse(req.body || {});
  const order = await prisma.order.findUnique({
    where: { number: code.toUpperCase() },
    include: { documents: { where: { id: documentId } } }
  });
  const doc = order?.documents[0];
  if (!doc || !canAccessOrder(order, req.user, email)) {
    return res.status(404).json({ ok: false, message: 'Documento não encontrado.' });
  }
  const safeName = doc.fileName.replace(/[^\w.\- ]+/g, '_');
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (doc.path.startsWith('data:')) {
    const base64Data = doc.path.split(',')[1] || '';
    return res.send(Buffer.from(base64Data, 'base64'));
  }
  return res.sendFile(resolveDocumentPath(doc.path));
});
