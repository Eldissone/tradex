import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { getSetting, setSetting } from '../../infrastructure/settings.js';
import { requireStaff, requireAdmin } from '../middlewares/auth.js';
import { hashPassword } from '../../infrastructure/auth/auth.js';
import multer from 'multer';
import { env } from '../../config/env.js';
import { whatsappConfigured } from '../../infrastructure/notifications/whatsapp.js';
import { emailConfigured } from '../../infrastructure/notifications/email.js';
import { assistantEnabled } from '../../infrastructure/assistant/assistant.js';
import { sendStaffReply } from '../../application/whatsapp-conversations.js';
import { notifyOrderEvent } from '../../infrastructure/notifications/index.js';

import { ORDER_STATUS_LABELS } from '../serializers.js';
import { MAX_IMAGE_BYTES, detectImageType, savePublicImage } from '../../infrastructure/storage/public-uploads.js';

export const adminRouter = Router();
adminRouter.use(requireStaff);

const num = (d) => (d == null ? 0 : Number(d));

// Métricas da Visão Geral
adminRouter.get('/analytics', async (_req, res) => {
  const [orders, pendingPayments, byCategory] = await Promise.all([
    prisma.order.findMany({ select: { status: true, totalAoa: true } }),
    prisma.payment.count({ where: { status: { in: ['PENDING', 'REVIEW_PENDING'] } } }),
    prisma.$queryRaw`
      SELECT c.name AS category, COALESCE(SUM(oi."unitPriceAoa" * oi.quantity), 0) AS revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY c.name
      ORDER BY revenue DESC`
  ]);

  const active = orders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status));
  return res.json({
    ok: true,
    data: {
      totalRevenueAoa: orders.filter(o => !['CANCELLED', 'RETURNED'].includes(o.status)).reduce((a, o) => a + num(o.totalAoa), 0),
      totalOrders: orders.length,
      activeOrders: active.length,
      inTransitCount: orders.filter(o => ['PROCESSING_SUPPLIER', 'IN_INTERNATIONAL_TRANSIT', 'ARRIVED_IN_ANGOLA'].includes(o.status)).length,
      pendingPaymentValidations: pendingPayments,
      categoriesBreakdown: byCategory.map(r => ({ category: r.category, revenueAoa: num(r.revenue) }))
    }
  });
});

// Fornecedores
const supplierSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.'),
  province: z.string().trim().optional().nullable(),
  categories: z.array(z.string()).optional(),
  contactPerson: z.string().trim().optional().nullable(),
  email: z.string().trim().email('E-mail inválido.').optional().nullable().or(z.literal('')),
  wechat: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  terms: z.string().trim().optional().nullable(),
  rating: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  active: z.boolean().optional()
});

adminRouter.get('/suppliers', async (_req, res) => {
  const list = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } }
  });
  return res.json({
    ok: true,
    total: list.length,
    data: list.map(({ _count, ...s }) => ({ ...s, productsCount: _count.products }))
  });
});

adminRouter.post('/suppliers', async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const created = await prisma.supplier.create({ data: { ...data, email: data.email || null } });
  return res.status(201).json({ ok: true, data: created });
});

adminRouter.put('/suppliers/:id', async (req, res) => {
  const data = supplierSchema.partial().parse(req.body);
  const updated = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.email !== undefined && { email: data.email || null }) }
  });
  return res.json({ ok: true, data: updated });
});

adminRouter.delete('/suppliers/:id', async (req, res) => {
  const found = await prisma.supplier.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!found) return res.status(404).json({ ok: false, message: 'Fornecedor não encontrado.' });
  // Os produtos associados ficam sem fornecedor
  await prisma.supplier.delete({ where: { id: found.id } });
  return res.json({ ok: true });
});

// Lotes de envio do agente parceiro
adminRouter.get('/shipments', async (_req, res) => {
  const list = await prisma.shipment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { orders: { select: { number: true } } }
  });
  return res.json({
    ok: true,
    total: list.length,
    data: list.map(s => ({
      id: s.code,
      title: s.title,
      mode: s.transportMode === 'AIR' ? 'Aéreo' : 'Marítimo',
      agentReference: s.agentReference,
      origin: s.origin,
      destination: s.destination,
      status: s.statusLabel || s.status,
      statusKey: s.status,
      transportMode: s.transportMode,
      departedAt: s.departedAt,
      etaAt: s.etaAt,
      etd: s.departedAt ? s.departedAt.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'A agendar',
      eta: s.etaAt ? s.etaAt.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      volumeWeight: s.volumeWeight || '—',
      ordersLinked: s.orders.map(o => o.number)
    }))
  });
});

// Estado das integrações (para o backoffice mostrar o que está activo)
adminRouter.get('/integrations', (_req, res) => {
  res.json({
    ok: true,
    data: {
      whatsapp: whatsappConfigured(),
      whatsappWebhook: Boolean(env.WHATSAPP_APP_SECRET && env.WHATSAPP_VERIFY_TOKEN),
      whatsappTemplate: Boolean(env.WHATSAPP_TEMPLATE_ORDER_UPDATE),
      email: emailConfigured(),
      assistant: assistantEnabled(),
      assistantModel: env.ASSISTANT_MODEL
    }
  });
});

// Envio manual de uma mensagem ao cliente de uma encomenda (WhatsApp + e-mail)
adminRouter.post('/notifications/send', async (req, res) => {
  const { orderNumber, message } = z.object({
    orderNumber: z.string().trim().min(1),
    message: z.string().trim().min(3, 'Escreva a mensagem.').max(1000)
  }).parse(req.body);
  const order = await prisma.order.findUnique({ where: { number: orderNumber.toUpperCase() } });
  if (!order) return res.status(404).json({ ok: false, message: 'Encomenda não encontrada.' });
  await notifyOrderEvent(order.id, 'manual', { message });
  const sent = await prisma.notification.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' }, take: 2 });
  return res.json({ ok: true, data: sent });
});

// Histórico de notificações
adminRouter.get('/notifications', async (req, res) => {
  const take = Math.min(200, parseInt(req.query.limit, 10) || 50);
  const list = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { order: { select: { number: true, customerName: true } } }
  });
  return res.json({
    ok: true,
    data: list.map(n => ({
      id: n.id, channel: n.channel, recipient: n.recipient, event: n.event, subject: n.subject,
      body: n.body, status: n.status, error: n.error, createdAt: n.createdAt,
      orderNumber: n.order?.number || null, customerName: n.order?.customerName || null
    }))
  });
});

// ---- Conversas WhatsApp ----
adminRouter.get('/conversations', async (req, res) => {
  const status = ['BOT', 'HUMAN', 'CLOSED'].includes(req.query.status) ? req.query.status : undefined;
  const list = await prisma.conversation.findMany({
    where: status ? { status } : {},
    orderBy: [{ unreadForStaff: 'desc' }, { lastMessageAt: 'desc' }],
    take: 200,
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      orders: { select: { number: true }, orderBy: { createdAt: 'desc' }, take: 3 }
    }
  });
  return res.json({
    ok: true,
    data: list.map(c => ({
      id: c.id, phone: c.phone, profileName: c.profileName, status: c.status, handoffReason: c.handoffReason,
      unread: c.unreadForStaff, lastMessageAt: c.lastMessageAt,
      canReply: Date.now() - c.lastMessageAt.getTime() < 24 * 3600 * 1000,
      lastMessage: c.messages[0] ? { text: c.messages[0].text.slice(0, 140), author: c.messages[0].author } : null,
      orders: c.orders.map(o => o.number)
    }))
  });
});

adminRouter.get('/conversations/:id', async (req, res) => {
  const c = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 500 }, orders: { select: { number: true, status: true } } }
  });
  if (!c) return res.status(404).json({ ok: false, message: 'Conversa não encontrada.' });
  await prisma.conversation.update({ where: { id: c.id }, data: { unreadForStaff: 0 } });
  return res.json({
    ok: true,
    data: {
      id: c.id, phone: c.phone, profileName: c.profileName, status: c.status, handoffReason: c.handoffReason,
      canReply: Date.now() - c.lastMessageAt.getTime() < 24 * 3600 * 1000,
      orders: c.orders.map(o => ({ number: o.number, status: ORDER_STATUS_LABELS[o.status] })),
      messages: c.messages.map(m => ({ id: m.id, direction: m.direction, author: m.author, text: m.text, deliveryStatus: m.deliveryStatus, createdAt: m.createdAt }))
    }
  });
});

adminRouter.post('/conversations/:id/reply', async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(1, 'Escreva a resposta.').max(4000) }).parse(req.body);
  const name = `${req.user.customer?.firstName || ''} ${req.user.customer?.lastName || ''}`.trim() || req.user.email;
  const result = await sendStaffReply(req.params.id, text, name);
  if (!result.ok) return res.status(result.status).json({ ok: false, message: result.message || 'Falha no envio.' });
  return res.json({ ok: true, delivery: result.delivery });
});

// BOT: devolve ao assistente; HUMAN: equipa assume; CLOSED: encerra
adminRouter.post('/conversations/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.enum(['BOT', 'HUMAN', 'CLOSED']) }).parse(req.body);
  await prisma.conversation.update({
    where: { id: req.params.id },
    data: { status, unreadForStaff: 0, ...(status === 'BOT' ? { handoffReason: null } : {}) }
  });
  return res.json({ ok: true });
});

// Configurações (prazos, taxas, dados bancários, métodos de pagamento)
const SETTING_KEYS = ['shipping', 'bank', 'payments', 'cms'];

adminRouter.get('/settings/:key', async (req, res) => {
  if (!SETTING_KEYS.includes(req.params.key)) {
    return res.status(404).json({ ok: false, message: 'Configuração desconhecida.' });
  }
  return res.json({ ok: true, data: await getSetting(req.params.key) });
});

const shippingSettingsSchema = z.object({
  modes: z.record(z.string(), z.object({
    label: z.string(),
    longLabel: z.string(),
    minDays: z.number().int().positive(),
    maxDays: z.number().int().positive(),
    freightRate: z.number().min(0).max(5)
  })),
  cargoInsuranceRate: z.number().min(0).max(1),
  deliveryMethods: z.record(z.string(), z.object({ label: z.string(), feeAoa: z.number().min(0) }))
});

const bankSettingsSchema = z.object({
  accountHolder: z.string().trim().min(1, 'Indique o titular das contas.'),
  accounts: z.array(z.object({
    bank: z.string().trim().min(1, 'Indique o nome do banco.'),
    iban: z.string().trim().min(10, 'IBAN inválido.')
  })).min(1, 'Indique pelo menos uma conta.').max(6)
});

const paymentSettingsSchema = z.object({
  enabledMethods: z.array(z.enum(['bank_transfer', 'mcx_express', 'mcx_reference'])).min(1, 'Active pelo menos um método de pagamento.')
});

adminRouter.put('/settings/:key', async (req, res, next) => (req.params.key === 'cms' ? next() : requireAdmin(req, res, next)), async (req, res) => {
  const { key } = req.params;
  if (!SETTING_KEYS.includes(key)) {
    return res.status(404).json({ ok: false, message: 'Configuração desconhecida.' });
  }
  const schemas = { shipping: shippingSettingsSchema, bank: bankSettingsSchema, payments: paymentSettingsSchema };
  const value = (schemas[key] || z.record(z.string(), z.any())).parse(req.body);
  return res.json({ ok: true, data: await setSetting(key, value) });
});

// ======================================================================
// Fase 3 — Utilizadores, conversão, financeiro, lotes e uploads
// ======================================================================

// ---- Utilizadores ----
adminRouter.get('/users', async (req, res) => {
  const { search, segment } = req.query;
  const where = {};
  if (search) {
    const q = String(search);
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { customer: { firstName: { contains: q, mode: 'insensitive' } } },
      { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: q } } }
    ];
  }
  if (segment === 'staff') where.role = { in: ['ADMIN', 'STAFF'] };
  if (segment === 'customers' || segment === 'buyers' || segment === 'non_buyers') where.role = 'CUSTOMER';

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      customer: {
        include: {
          orders: { select: { totalAoa: true, status: true, isGuest: true, createdAt: true } },
          cart: { select: { updatedAt: true, _count: { select: { items: true } } } }
        }
      }
    }
  });

  let data = users.map(u => {
    const orders = (u.customer?.orders || []).filter(o => !['CANCELLED', 'RETURNED'].includes(o.status));
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      active: u.active,
      firstName: u.customer?.firstName || '',
      lastName: u.customer?.lastName || '',
      phone: u.customer?.phone || '',
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      ordersCount: orders.length,
      totalSpentAoa: orders.reduce((a, o) => a + num(o.totalAoa), 0),
      lastOrderAt: orders.length ? orders.map(o => o.createdAt).sort((a, b) => b - a)[0] : null,
      convertedFromGuest: (u.customer?.orders || []).some(o => o.isGuest),
      cartItems: u.customer?.cart?._count.items || 0
    };
  });

  if (segment === 'buyers') data = data.filter(u => u.ordersCount > 0);
  if (segment === 'non_buyers') data = data.filter(u => u.ordersCount === 0);

  return res.json({ ok: true, total: data.length, data });
});

const userFields = {
  firstName: z.string().trim().min(1, 'O nome é obrigatório.').max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']),
  password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.')
};

const userCreateSchema = z.object({ ...userFields, active: z.boolean().optional().default(true) });

const userUpdateSchema = z.object({
  active: z.boolean().optional(),
  role: userFields.role.optional(),
  email: userFields.email.optional(),
  firstName: userFields.firstName.optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: userFields.phone,
  password: userFields.password.optional()
});

const userOut = (u) => ({
  id: u.id, email: u.email, role: u.role, active: u.active,
  firstName: u.customer?.firstName || '', lastName: u.customer?.lastName || '', phone: u.customer?.phone || ''
});

adminRouter.post('/users', requireAdmin, async (req, res) => {
  const data = userCreateSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    return res.status(409).json({ ok: false, message: 'Já existe uma conta com este e-mail.' });
  }
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      active: data.active,
      customer: { create: { firstName: data.firstName, lastName: data.lastName, phone: data.phone || null } }
    },
    include: { customer: true }
  });
  // Liga encomendas feitas como convidado com este e-mail
  await prisma.order.updateMany({ where: { customerId: null, customerEmail: data.email }, data: { customerId: user.customer.id } });
  return res.status(201).json({ ok: true, data: userOut(user) });
});

adminRouter.patch('/users/:id', requireAdmin, async (req, res) => {
  const { firstName, lastName, phone, password, ...account } = userUpdateSchema.parse(req.body);
  if (req.params.id === req.user.id && (account.active === false || (account.role && account.role !== 'ADMIN'))) {
    return res.status(400).json({ ok: false, message: 'Não pode desactivar nem retirar permissões à sua própria conta.' });
  }
  if (account.email) {
    const taken = await prisma.user.findFirst({ where: { email: account.email, id: { not: req.params.id } }, select: { id: true } });
    if (taken) return res.status(409).json({ ok: false, message: 'Já existe uma conta com este e-mail.' });
  }
  const profile = { ...(firstName !== undefined && { firstName }), ...(lastName !== undefined && { lastName }), ...(phone !== undefined && { phone: phone || null }) };
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    // Alterar conta, papel ou palavra-passe revoga as sessões abertas
    data: {
      ...account,
      ...(password && { passwordHash: await hashPassword(password) }),
      passwordChangedAt: new Date(),
      ...(Object.keys(profile).length && {
        customer: { upsert: { create: { firstName: firstName ?? '', lastName: lastName ?? '', ...profile }, update: profile } }
      })
    },
    include: { customer: true }
  });
  return res.json({ ok: true, data: userOut(updated) });
});

// As encomendas da conta mantêm os dados do cliente guardados na compra
adminRouter.delete('/users/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ ok: false, message: 'Não pode eliminar a sua própria conta.' });
  }
  const found = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!found) return res.status(404).json({ ok: false, message: 'Conta não encontrada.' });
  await prisma.user.delete({ where: { id: found.id } });
  return res.json({ ok: true });
});

// ---- Conversão e comportamento ----
const ABANDONED_CART_HOURS = 24;

adminRouter.get('/analytics/customers', async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - days * 86400000);

  const [customers, orders, carts] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { createdAt: true, customer: { select: { id: true, orders: { select: { id: true, isGuest: true, status: true } } } } }
    }),
    prisma.order.findMany({
      where: { status: { notIn: ['CANCELLED', 'RETURNED'] } },
      select: { customerId: true, isGuest: true, totalAoa: true, createdAt: true }
    }),
    prisma.cart.findMany({
      where: { items: { some: {} } },
      select: { updatedAt: true, customerId: true }
    })
  ]);

  const registered = customers.length;
  const newInPeriod = customers.filter(u => u.createdAt >= since).length;
  const buyers = customers.filter(u => (u.customer?.orders || []).some(o => !['CANCELLED', 'RETURNED'].includes(o.status))).length;
  const convertedFromGuest = customers.filter(u => (u.customer?.orders || []).some(o => o.isGuest)).length;

  const guestOrders = orders.filter(o => o.isGuest);
  const accountOrders = orders.filter(o => !o.isGuest);
  const sum = (list) => list.reduce((a, o) => a + num(o.totalAoa), 0);

  // Carrinho abandonado: com produtos, sem mexer há 24h e sem encomenda depois disso
  const cutoff = new Date(Date.now() - ABANDONED_CART_HOURS * 3600000);
  const lastOrderByCustomer = new Map();
  for (const o of orders) {
    if (!o.customerId) continue;
    const prev = lastOrderByCustomer.get(o.customerId);
    if (!prev || o.createdAt > prev) lastOrderByCustomer.set(o.customerId, o.createdAt);
  }
  const abandonedCarts = carts.filter(c => c.updatedAt < cutoff && !(lastOrderByCustomer.get(c.customerId) > c.updatedAt)).length;

  const rate = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  return res.json({
    ok: true,
    data: {
      periodDays: days,
      registeredCustomers: registered,
      newCustomersInPeriod: newInPeriod,
      buyers,
      buyerRate: rate(buyers, registered),
      guestOrders: { count: guestOrders.length, valueAoa: sum(guestOrders), share: rate(guestOrders.length, orders.length) },
      accountOrders: { count: accountOrders.length, valueAoa: sum(accountOrders), share: rate(accountOrders.length, orders.length) },
      guestsConvertedToAccount: convertedFromGuest,
      activeCarts: carts.length,
      abandonedCarts,
      abandonedCartHours: ABANDONED_CART_HOURS
    }
  });
});

// ---- Resumo financeiro por período ----
adminRouter.get('/finance/summary', async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return res.status(400).json({ ok: false, message: 'Datas inválidas.' });
  }

  const groups = await prisma.payment.groupBy({
    by: ['status'],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
    _sum: { amountAoa: true }
  });
  const byStatus = Object.fromEntries(groups.map(g => [g.status, { count: g._count._all, amountAoa: num(g._sum.amountAoa) }]));
  const empty = { count: 0, amountAoa: 0 };

  return res.json({
    ok: true,
    data: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      received: byStatus.APPROVED || empty,
      awaitingValidation: byStatus.REVIEW_PENDING || empty,
      awaitingTransfer: byStatus.PENDING || empty,
      declined: byStatus.DECLINED || empty,
      refunded: byStatus.REFUNDED || empty
    }
  });
});

// ---- Lotes de envio (agente parceiro) ----
const SHIPMENT_STATUS_LABELS = {
  DRAFT: 'Em preparação',
  ORIGIN_WAREHOUSE: 'No armazém na China',
  INTERNATIONAL_TRANSIT: 'Enviado',
  ARRIVED: 'Chegou a Angola',
  DISTRIBUTION: 'Em distribuição',
  DELIVERED: 'Concluído'
};

// Estado do lote -> estado das encomendas incluídas (só nos marcos comuns a todas)
const SHIPMENT_TO_ORDER_STATUS = {
  INTERNATIONAL_TRANSIT: 'IN_INTERNATIONAL_TRANSIT',
  ARRIVED: 'ARRIVED_IN_ANGOLA'
};

const shipmentSchema = z.object({
  title: z.string().trim().min(1, 'Indique um nome para o lote.'),
  transportMode: z.enum(['AIR', 'SEA']),
  agentReference: z.string().trim().optional().nullable(),
  origin: z.string().trim().min(1).default('Guangzhou (China)'),
  destination: z.string().trim().default('Luanda (Angola)'),
  departedAt: z.coerce.date().optional().nullable(),
  etaAt: z.coerce.date().optional().nullable(),
  volumeWeight: z.string().trim().optional().nullable()
});

async function nextShipmentCode(mode) {
  const prefix = `SHP-${new Date().getFullYear()}-${mode === 'AIR' ? 'AIR' : 'SEA'}-`;
  const count = await prisma.shipment.count({ where: { code: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}

adminRouter.post('/shipments', async (req, res) => {
  const data = shipmentSchema.parse(req.body);
  const created = await prisma.shipment.create({
    data: { ...data, code: await nextShipmentCode(data.transportMode), status: 'DRAFT', statusLabel: SHIPMENT_STATUS_LABELS.DRAFT }
  });
  return res.status(201).json({ ok: true, data: { id: created.code } });
});

adminRouter.put('/shipments/:code', async (req, res) => {
  const data = shipmentSchema.partial().parse(req.body);
  await prisma.shipment.update({ where: { code: req.params.code }, data });
  return res.json({ ok: true });
});

// Elimina o lote; as encomendas incluídas ficam sem lote (mantêm o estado actual)
adminRouter.delete('/shipments/:code', async (req, res) => {
  const found = await prisma.shipment.findUnique({ where: { code: req.params.code }, select: { id: true } });
  if (!found) return res.status(404).json({ ok: false, message: 'Lote não encontrado.' });
  await prisma.$transaction([
    prisma.order.updateMany({ where: { shipmentId: found.id }, data: { shipmentId: null } }),
    prisma.shipment.delete({ where: { id: found.id } })
  ]);
  return res.json({ ok: true });
});

// Associa encomendas (pagas) a um lote
adminRouter.post('/shipments/:code/orders', async (req, res) => {
  const { orderNumbers } = z.object({ orderNumbers: z.array(z.string()).min(1).max(500) }).parse(req.body);
  const shipment = await prisma.shipment.findUnique({ where: { code: req.params.code } });
  if (!shipment) return res.status(404).json({ ok: false, message: 'Lote não encontrado.' });

  const { count } = await prisma.order.updateMany({
    where: { number: { in: orderNumbers.map(n => n.toUpperCase()) }, status: { notIn: ['AWAITING_PAYMENT', 'CANCELLED', 'RETURNED'] } },
    data: { shipmentId: shipment.id }
  });
  return res.json({ ok: true, linked: count, skipped: orderNumbers.length - count });
});

adminRouter.delete('/shipments/:code/orders/:number', async (req, res) => {
  const shipment = await prisma.shipment.findUnique({ where: { code: req.params.code } });
  if (!shipment) return res.status(404).json({ ok: false, message: 'Lote não encontrado.' });
  await prisma.order.updateMany({ where: { number: req.params.number, shipmentId: shipment.id }, data: { shipmentId: null } });
  return res.json({ ok: true });
});

// Actualiza o estado do lote e propaga às encomendas incluídas
adminRouter.post('/shipments/:code/status', async (req, res) => {
  const { status, note } = z.object({
    status: z.enum(Object.keys(SHIPMENT_STATUS_LABELS)),
    note: z.string().trim().max(500).optional()
  }).parse(req.body);

  const shipment = await prisma.shipment.findUnique({ where: { code: req.params.code }, include: { orders: true } });
  if (!shipment) return res.status(404).json({ ok: false, message: 'Lote não encontrado.' });

  const orderStatus = SHIPMENT_TO_ORDER_STATUS[status];
  const operator = req.user.email;
  const ops = [
    prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status,
        statusLabel: SHIPMENT_STATUS_LABELS[status],
        ...(status === 'INTERNATIONAL_TRANSIT' && !shipment.departedAt ? { departedAt: new Date() } : {})
      }
    })
  ];

  let propagated = 0;
  const notifyIds = [];
  if (orderStatus) {
    const label = ORDER_STATUS_LABELS[orderStatus];
    for (const order of shipment.orders) {
      if (['DELIVERED', 'CANCELLED', 'RETURNED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status)) continue;
      propagated++;
      notifyIds.push(order.id);
      ops.push(prisma.order.update({ where: { id: order.id }, data: { status: orderStatus } }));
      ops.push(prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          shipmentId: shipment.id,
          status: orderStatus,
          label,
          note: note || (orderStatus === 'IN_INTERNATIONAL_TRANSIT'
            ? `Encomenda enviada no lote ${shipment.title} (${shipment.transportMode === 'AIR' ? 'aéreo' : 'marítimo'}).`
            : 'Encomenda chegou a Angola com o agente parceiro.'),
          responsible: operator
        }
      }));
    }
  }

  await prisma.$transaction(ops);
  // Envia em sequência, sem atrasar a resposta
  (async () => {
    for (const id of notifyIds) await notifyOrderEvent(id, 'status_changed');
  })();
  return res.json({ ok: true, propagated });
});

// ---- Upload de imagens (produtos, banners) ----
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

adminRouter.post('/uploads', imageUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, message: 'Escolha uma imagem.' });
  const type = detectImageType(req.file.buffer);
  if (!type) return res.status(400).json({ ok: false, message: 'Formato não suportado. Use JPG, PNG ou WEBP.' });
  const relative = await savePublicImage(req.file.buffer, type);
  const base = `${req.protocol}://${req.get('host')}`;
  return res.status(201).json({ ok: true, data: { url: `${base}/uploads/${relative}` } });
});
