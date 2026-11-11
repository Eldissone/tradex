import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { createOrder, OrderError } from '../../application/orders.js';
import { notifyOrderEvent } from '../../infrastructure/notifications/index.js';
import { optionalAuth, requireAuth, requireStaff, isStaff } from '../middlewares/auth.js';
import { serializeOrder, ORDER_INCLUDE, ORDER_STATUS_LABELS } from '../serializers.js';

export const ordersRouter = Router();

const addressSchema = z.object({
  label: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  reference: z.string().optional().nullable()
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    quantity: z.coerce.number().int().positive().max(100000)
  })).min(1, 'O pedido está vazio.'),
  customer: z.object({
    name: z.string().trim().min(1, 'O nome é obrigatório.'),
    email: z.string().trim().toLowerCase().email('E-mail inválido.'),
    phone: z.string().trim().min(6, 'O telefone é obrigatório.'),
    nif: z.string().trim().optional().nullable()
  }),
  addressId: z.string().optional().nullable(),
  address: addressSchema.optional().nullable(),
  shippingMode: z.enum(['sea_lcl', 'air_exp']).default('sea_lcl'),
  deliveryMethod: z.enum(['pickup', 'delivery_luanda', 'delivery_interprovincial']).default('pickup'),
  paymentMethod: z.string().default('bank_transfer')
});

function canSeeOrder(user, order) {
  if (!user) return false;
  if (isStaff(user)) return true;
  return (user.customer && order.customerId === user.customer.id) || order.customerEmail === user.email;
}

// Criação de encomenda (cliente com sessão ou convidado)
ordersRouter.post('/', optionalAuth, async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  try {
    const order = await createOrder(input, { customer: req.user?.customer || null, channel: 'WEB' });
    notifyOrderEvent(order.id, 'order_created');
    return res.status(201).json({ ok: true, data: serializeOrder(order) });
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ ok: false, message: err.message });
    throw err;
  }
});

// Lista: staff vê todas; cliente vê as suas
ordersRouter.get('/', requireAuth, async (req, res) => {
  const { status, email } = req.query;
  const where = {};

  if (isStaff(req.user)) {
    if (email) where.customerEmail = String(email).toLowerCase();
  } else {
    where.OR = [
      ...(req.user.customer ? [{ customerId: req.user.customer.id }] : []),
      { customerEmail: req.user.email }
    ];
  }
  if (status && status !== 'all') where.status = String(status);

  const orders = await prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
  return res.json({ ok: true, total: orders.length, data: orders.map(serializeOrder) });
});

// Detalhe (dono ou staff)
ordersRouter.get('/:number', requireAuth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { OR: [{ number: req.params.number.trim().toUpperCase() }, { id: req.params.number }] },
    include: ORDER_INCLUDE
  });
  if (!order || !canSeeOrder(req.user, order)) {
    return res.status(404).json({ ok: false, message: 'Encomenda não encontrada.' });
  }
  return res.json({ ok: true, data: serializeOrder(order) });
});

// Actualização de estado (backoffice)
const statusSchema = z.object({
  status: z.enum(Object.keys(ORDER_STATUS_LABELS)),
  note: z.string().trim().optional(),
  responsible: z.string().trim().optional(),
  location: z.string().trim().optional(),
  notify: z.boolean().default(true)
});

ordersRouter.patch('/:number/status', requireStaff, async (req, res) => {
  const { status, note, responsible, location, notify } = statusSchema.parse(req.body);
  const order = await prisma.order.findFirst({
    where: { OR: [{ number: req.params.number.trim().toUpperCase() }, { id: req.params.number }] },
    include: { payments: true }
  });
  if (!order) {
    return res.status(404).json({ ok: false, message: 'Encomenda não encontrada.' });
  }

  const label = ORDER_STATUS_LABELS[status];
  const operator = responsible || `${req.user.customer?.firstName || ''} ${req.user.customer?.lastName || ''}`.trim() || req.user.email;

  const ops = [
    prisma.order.update({ where: { id: order.id }, data: { status } }),
    prisma.trackingEvent.create({
      data: { orderId: order.id, status, label, note: note || `Estado actualizado para ${label}.`, responsible: operator, location: location || null }
    })
  ];

  // Confirmar pagamento por esta via também aprova o pagamento pendente
  const pending = order.payments.find(p => p.status === 'PENDING' || p.status === 'REVIEW_PENDING');
  if (status === 'PAYMENT_CONFIRMED' && pending) {
    ops.push(prisma.payment.update({
      where: { id: pending.id },
      data: { status: 'APPROVED', reviewedBy: req.user.email, reviewedAt: new Date() }
    }));
  }

  await prisma.$transaction(ops);
  if (notify) {
    notifyOrderEvent(order.id, status === 'PAYMENT_CONFIRMED' ? 'payment_approved' : 'status_changed', { note });
  }
  const updated = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
  return res.json({ ok: true, data: serializeOrder(updated) });
});
