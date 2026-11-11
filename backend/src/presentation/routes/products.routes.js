import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { optionalAuth, requireStaff, isStaff } from '../middlewares/auth.js';
import { serializeProduct } from '../serializers.js';

export const productsRouter = Router();

const INCLUDE = { category: true };

function slugify(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function uniqueSlug(title, excludeId) {
  const base = slugify(title) || 'produto';
  let slug = base;
  for (let i = 2; ; i++) {
    const found = await prisma.product.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

// Lista de produtos (público vê só os activos; staff pode pedir ?includeInactive=1)
productsRouter.get('/', optionalAuth, async (req, res) => {
  const { category, search, sort, includeInactive } = req.query;
  const showAll = includeInactive === '1' && isStaff(req.user);

  const where = {
    ...(showAll ? {} : { active: true }),
    ...(category && category !== 'all' ? { category: { slug: String(category) } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: String(search), mode: 'insensitive' } },
            { specs: { contains: String(search), mode: 'insensitive' } },
            { origin: { contains: String(search), mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const orderBy =
    sort === 'price_asc' ? { priceAoa: 'asc' } :
    sort === 'price_desc' ? { priceAoa: 'desc' } :
    { createdAt: 'asc' };

  const items = await prisma.product.findMany({ where, orderBy, include: INCLUDE });
  return res.json({ ok: true, total: items.length, data: items.map(serializeProduct) });
});

// Categorias
productsRouter.get('/categories', async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return res.json({ ok: true, data: cats.map(c => ({ id: c.id, slug: c.slug, name: c.name })) });
});

// Detalhe por ID ou slug
productsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const item = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: INCLUDE
  });
  if (!item || !item.active) {
    return res.status(404).json({ ok: false, message: 'Produto não encontrado.' });
  }
  return res.json({ ok: true, data: serializeProduct(item) });
});

const productSchema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório.'),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  priceAoa: z.coerce.number().positive('O preço deve ser positivo.'),
  description: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  moq: z.string().optional().nullable(),
  unit: z.string().optional(),
  specs: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  images: z.array(z.object({ url: z.string(), label: z.string().optional() })).optional(),
  techSpecs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  logistics: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  supplierId: z.string().optional().nullable()
});

async function resolveCategoryId(slug) {
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) {
    const err = new Error('CATEGORY_NOT_FOUND');
    err.status = 400;
    throw err;
  }
  return cat.id;
}

function toData(input) {
  const { category, ...rest } = input;
  return {
    ...rest,
    image: rest.image ?? rest.images?.[0]?.url ?? undefined
  };
}

// Criação (staff)
productsRouter.post('/', requireStaff, async (req, res) => {
  const input = productSchema.parse(req.body);
  let categoryId;
  try {
    categoryId = await resolveCategoryId(input.category);
  } catch {
    return res.status(400).json({ ok: false, message: 'Categoria inexistente.' });
  }

  const created = await prisma.product.create({
    data: { ...toData(input), categoryId, slug: await uniqueSlug(input.title) },
    include: INCLUDE
  });
  return res.status(201).json({ ok: true, data: serializeProduct(created) });
});

// Actualização (staff)
productsRouter.put('/:id', requireStaff, async (req, res) => {
  const input = productSchema.partial().parse(req.body);
  const data = toData(input);
  if (input.category) {
    try {
      data.categoryId = await resolveCategoryId(input.category);
    } catch {
      return res.status(400).json({ ok: false, message: 'Categoria inexistente.' });
    }
  }
  if (input.title) data.slug = await uniqueSlug(input.title, req.params.id);

  const updated = await prisma.product.update({ where: { id: req.params.id }, data, include: INCLUDE });
  return res.json({ ok: true, data: serializeProduct(updated) });
});

// Eliminação definitiva (staff). As encomendas antigas mantêm título, imagem e preço dos itens.
productsRouter.delete('/:id', requireStaff, async (req, res, next) => {
  if (req.query.permanent !== '1') return next();
  const found = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!found) return res.status(404).json({ ok: false, message: 'Produto não encontrado.' });
  await prisma.product.delete({ where: { id: req.params.id } });
  return res.json({ ok: true, data: { id: req.params.id, deleted: true } });
});

// Desactivação (staff) — mantém o histórico das encomendas
productsRouter.delete('/:id', requireStaff, async (req, res) => {
  const updated = await prisma.product.update({ where: { id: req.params.id }, data: { active: false }, include: INCLUDE });
  return res.json({ ok: true, data: serializeProduct(updated) });
});
