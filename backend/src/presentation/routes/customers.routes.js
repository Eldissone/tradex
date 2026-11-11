import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { requireAuth } from '../middlewares/auth.js';
import { serializeAddress, serializeProduct } from '../serializers.js';

// Dados do cliente com sessão iniciada: moradas, favoritos e carrinho
export const customersRouter = Router();
customersRouter.use(requireAuth);

async function ensureCustomer(user) {
  if (user.customer) return user.customer;
  return prisma.customer.create({ data: { userId: user.id, firstName: '', lastName: '' } });
}

customersRouter.get('/addresses', async (req, res) => {
  const customer = await ensureCustomer(req.user);
  const list = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });
  return res.json({ ok: true, data: list.map(serializeAddress) });
});

const addressSchema = z.object({
  label: z.string().trim().optional().nullable(),
  recipientName: z.string().trim().min(1, 'Indique o destinatário.'),
  phone: z.string().trim().min(6, 'Indique o telefone.'),
  province: z.string().trim().default('Luanda'),
  municipality: z.string().trim().min(1, 'Indique o município.'),
  street: z.string().trim().min(1, 'Indique a rua / edifício.'),
  reference: z.string().trim().optional().nullable(),
  isDefault: z.boolean().optional()
});

customersRouter.post('/addresses', async (req, res) => {
  const data = addressSchema.parse(req.body);
  const customer = await ensureCustomer(req.user);
  const count = await prisma.address.count({ where: { customerId: customer.id } });
  const isDefault = data.isDefault || count === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...data, isDefault, customerId: customer.id } });
  });
  return res.status(201).json({ ok: true, data: serializeAddress(created) });
});

customersRouter.delete('/addresses/:id', async (req, res) => {
  const customer = await ensureCustomer(req.user);
  const { count } = await prisma.address.deleteMany({ where: { id: req.params.id, customerId: customer.id } });
  if (!count) return res.status(404).json({ ok: false, message: 'Morada não encontrada.' });
  return res.json({ ok: true });
});

customersRouter.get('/favorites', async (req, res) => {
  const customer = await ensureCustomer(req.user);
  return res.json({ ok: true, data: customer.favorites });
});

customersRouter.post('/favorites/:productId/toggle', async (req, res) => {
  const customer = await ensureCustomer(req.user);
  const id = req.params.productId;
  const favorites = customer.favorites.includes(id)
    ? customer.favorites.filter(f => f !== id)
    : [...customer.favorites, id];
  await prisma.customer.update({ where: { id: customer.id }, data: { favorites } });
  return res.json({ ok: true, data: favorites });
});

// ---- Carrinho ----
async function readCart(customerId) {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: { items: { include: { product: { include: { category: true } } } } }
  });
  if (!cart) return { items: [], updatedAt: null };
  return {
    updatedAt: cart.updatedAt,
    // Produtos desactivados entretanto deixam de aparecer
    items: cart.items
      .filter(i => i.product?.active)
      .map(i => ({ ...serializeProduct(i.product), quantity: i.quantity }))
  };
}

customersRouter.get('/cart', async (req, res) => {
  const customer = await ensureCustomer(req.user);
  return res.json({ ok: true, data: await readCart(customer.id) });
});

const cartSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(60),
    quantity: z.coerce.number().int().min(1).max(100000)
  })).max(200)
});

// Substitui o conteúdo do carrinho (o frontend envia o estado completo)
customersRouter.put('/cart', async (req, res) => {
  const { items } = cartSchema.parse(req.body);
  const customer = await ensureCustomer(req.user);

  // Agrupa repetidos e ignora produtos inexistentes/inactivos
  const merged = new Map();
  for (const i of items) merged.set(i.id, (merged.get(i.id) || 0) + i.quantity);
  const valid = await prisma.product.findMany({
    where: { id: { in: [...merged.keys()] }, active: true },
    select: { id: true }
  });
  const rows = valid.map(p => ({ productId: p.id, quantity: merged.get(p.id) }));

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { customerId: customer.id },
      update: { updatedAt: new Date() },
      create: { customerId: customer.id }
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (rows.length) {
      await tx.cartItem.createMany({ data: rows.map(r => ({ ...r, cartId: cart.id })) });
    }
  });

  return res.json({ ok: true, data: await readCart(customer.id) });
});
