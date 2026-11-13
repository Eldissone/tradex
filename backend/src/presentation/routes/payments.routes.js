import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { env } from '../../config/env.js';
import { getSetting } from '../../infrastructure/settings.js';
import { optionalAuth, requireAuth, requireStaff, isStaff } from '../middlewares/auth.js';
import { serializePayment, serializeOrder, ORDER_INCLUDE } from '../serializers.js';
import multer from 'multer';
import { notifyOrderEvent } from '../../infrastructure/notifications/index.js';

import { rateLimit } from '../middlewares/rate-limit.js';

const proofLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });
import { MAX_PROOF_BYTES, detectProofType, saveProof, resolveProofPath, deleteProof } from '../../infrastructure/storage/payment-proofs.js';

export const paymentsRouter = Router();

// Métodos activos e dados bancários (público, usado no checkout)
paymentsRouter.get('/config', async (_req, res) => {
  const [payments, bank] = await Promise.all([getSetting('payments'), getSetting('bank')]);
  return res.json({ ok: true, data: { enabledMethods: payments.enabledMethods, bank } });
});

// Histórico: staff vê tudo; cliente vê os seus
paymentsRouter.get('/', requireAuth, async (req, res) => {
  const where = isStaff(req.user)
    ? {}
    : {
        order: {
          OR: [
            ...(req.user.customer ? [{ customerId: req.user.customer.id }] : []),
            { customerEmail: req.user.email }
          ]
        }
      };
  const list = await prisma.payment.findMany({ where, include: { order: true }, orderBy: { createdAt: 'desc' } });
  return res.json({ ok: true, total: list.length, data: list.map(p => serializePayment(p)) });
});

// Upload do comprovativo de transferência (PDF, JPG ou PNG até 5 MB).
// Com sessão: tem de ser o dono. Convidado: tem de indicar o e-mail da encomenda.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROOF_BYTES, files: 1, fields: 5 }
});

const proofSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('').transform(() => undefined)),
  reference: z.string().trim().max(120).optional()
});

paymentsRouter.post('/:orderNumber/proof', proofLimiter, optionalAuth, upload.single('file'), async (req, res) => {
  const { email, reference } = proofSchema.parse(req.body || {});
  const order = await prisma.order.findUnique({
    where: { number: req.params.orderNumber.trim().toUpperCase() },
    include: { payments: { orderBy: { createdAt: 'desc' } } }
  });

  const isOwner = req.user && (
    isStaff(req.user) ||
    (req.user.customer && order?.customerId === req.user.customer.id) ||
    order?.customerEmail === req.user.email
  );
  const isGuestMatch = !req.user && email && order?.customerEmail === email;

  if (!order || (!isOwner && !isGuestMatch)) {
    return res.status(404).json({ ok: false, message: 'Encomenda não encontrada. Confirme o código e o e-mail usado na compra.' });
  }

  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'Anexe o comprovativo (PDF, JPG ou PNG).' });
  }
  const type = detectProofType(req.file.buffer);
  if (!type) {
    return res.status(400).json({ ok: false, message: 'Formato não suportado. Envie um PDF, JPG ou PNG.' });
  }

  const payment = order.payments.find(p => p.status === 'PENDING' || p.status === 'DECLINED' || p.status === 'REVIEW_PENDING');
  if (!payment) {
    return res.status(409).json({ ok: false, message: 'O pagamento desta encomenda já foi validado.' });
  }

  const storedPath = await saveProof(req.file.buffer, type);
  const txRef = reference || payment.reference || `DEP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const replacing = payment.status === 'REVIEW_PENDING';

  try {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REVIEW_PENDING',
          reference: txRef,
          proofPath: storedPath,
          proofFileName: (req.file.originalname || `comprovativo.${type.ext}`).slice(0, 150),
          proofMimeType: type.mime,
          proofSize: req.file.size,
          proofUploadedAt: new Date(),
          rejectionReason: null
        }
      }),
      prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          status: 'REVIEW_PENDING',
          label: replacing ? 'Comprovativo Substituído' : 'Comprovativo de Pagamento Submetido',
          note: `Comprovativo de transferência recebido (Ref: ${txRef}). Aguarda validação da tesouraria.`,
          responsible: order.customerName
        }
      })
    ]);
  } catch (err) {
    await deleteProof(storedPath);
    throw err;
  }
  // Remove o ficheiro anterior, se tiver sido substituído
  if (payment.proofPath && payment.proofPath !== storedPath) await deleteProof(payment.proofPath);

  notifyOrderEvent(order.id, 'proof_received');
  const updated = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
  return res.json({ ok: true, data: serializeOrder(updated) });
});

// Visualização do comprovativo (apenas tesouraria / staff)
paymentsRouter.get('/:id/proof', requireStaff, async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment?.proofPath) {
    return res.status(404).json({ ok: false, message: 'Este pagamento não tem comprovativo.' });
  }
  const safeName = (payment.proofFileName || 'comprovativo').replace(/[^\w.\- ]+/g, '_');
  res.setHeader('Content-Type', payment.proofMimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (payment.proofPath.startsWith('data:')) {
    const base64Data = payment.proofPath.split(',')[1] || '';
    return res.send(Buffer.from(base64Data, 'base64'));
  }
  return res.sendFile(resolveProofPath(payment.proofPath));
});

// Validação manual pela tesouraria
const reviewSchema = z.object({
  approved: z.boolean(),
  note: z.string().trim().max(500).optional()
});

paymentsRouter.post('/:id/review', requireStaff, async (req, res) => {
  const { approved, note } = reviewSchema.parse(req.body);
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { order: true } });
  if (!payment) {
    return res.status(404).json({ ok: false, message: 'Pagamento não encontrado.' });
  }
  if (payment.status === 'APPROVED') {
    return res.status(409).json({ ok: false, message: 'Este pagamento já foi aprovado.' });
  }
  if (approved && !payment.proofPath && !payment.reference) {
    return res.status(409).json({ ok: false, message: 'Ainda não há comprovativo para validar.' });
  }

  const operator = req.user.email;
  const ops = [
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: approved ? 'APPROVED' : 'DECLINED',
        reviewedBy: operator,
        reviewedAt: new Date(),
        rejectionReason: approved ? null : (note || 'Comprovativo não validado.')
      }
    }),
    prisma.trackingEvent.create({
      data: {
        orderId: payment.orderId,
        status: approved ? 'PAYMENT_CONFIRMED' : 'PAYMENT_DECLINED',
        label: approved ? 'Pagamento Confirmado' : 'Pagamento Rejeitado',
        note: note || (approved ? 'Pagamento validado pela tesouraria.' : 'Comprovativo rejeitado. Contacte a TradeX ou submeta novamente.'),
        responsible: 'Tesouraria TradeX'
      }
    })
  ];
  if (approved && payment.order.status === 'AWAITING_PAYMENT') {
    ops.push(prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAYMENT_CONFIRMED' } }));
  }
  await prisma.$transaction(ops);
  notifyOrderEvent(payment.orderId, approved ? 'payment_approved' : 'payment_declined', { reason: note });

  const updated = await prisma.payment.findUnique({ where: { id: payment.id }, include: { order: true } });
  return res.json({ ok: true, data: serializePayment(updated) });
});

// Webhook de gateway: desactivado até existir um segredo configurado (PAYMENT_WEBHOOK_SECRET)
paymentsRouter.post('/webhook', async (req, res) => {
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    return res.status(503).json({ ok: false, message: 'Webhook de pagamentos não configurado.' });
  }
  const provided = String(req.headers['x-webhook-secret'] || '');
  const expected = env.PAYMENT_WEBHOOK_SECRET;
  const valid = provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!valid) {
    return res.status(401).json({ ok: false, message: 'Assinatura inválida.' });
  }

  const { transactionId, orderNumber, status } = z.object({
    orderNumber: z.string(),
    transactionId: z.string().optional(),
    status: z.string()
  }).parse(req.body);

  const order = await prisma.order.findUnique({ where: { number: orderNumber }, include: { payments: true } });
  const payment = order?.payments.find(p => p.status !== 'APPROVED');
  if (!payment) {
    return res.status(404).json({ ok: false, message: 'Pagamento não encontrado.' });
  }

  const approved = status === 'APPROVED' || status === 'SUCCESS';
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: approved ? 'APPROVED' : 'DECLINED', transactionId: transactionId || undefined, reviewedBy: 'gateway', reviewedAt: new Date() }
    }),
    ...(approved && order.status === 'AWAITING_PAYMENT'
      ? [prisma.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_CONFIRMED' } })]
      : []),
    prisma.trackingEvent.create({
      data: {
        orderId: order.id,
        status: approved ? 'PAYMENT_CONFIRMED' : 'PAYMENT_DECLINED',
        label: approved ? 'Pagamento Confirmado' : 'Pagamento Recusado',
        responsible: 'Gateway de Pagamentos'
      }
    })
  ]);
  notifyOrderEvent(order.id, approved ? 'payment_approved' : 'payment_declined', { reason: 'Pagamento recusado pelo banco.' });

  return res.json({ ok: true });
});
