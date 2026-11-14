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

  try {
    const items = await prisma.product.findMany({ where, orderBy, include: INCLUDE });
    return res.json({ ok: true, total: items.length, data: items.map(serializeProduct) });
  } catch (err) {
    console.warn('[TradeX Products] Base de dados inacessível ou offline:', err.message);
    return res.json({
      ok: true,
      total: 0,
      data: [],
      database: 'offline',
      message: 'Base de dados em configuração. A carregar catálogo padrão local.'
    });
  }
});

// Categorias (listar, criar, atualizar e remover)
const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.').max(80),
  slug: z.string().trim().max(80).optional().nullable()
});

const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.').max(80).optional(),
  slug: z.string().trim().max(80).optional().nullable()
});

productsRouter.get('/categories', async (_req, res) => {
  try {
    const cats = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } }
      }
    });
    return res.json({
      ok: true,
      data: cats.map(c => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        productCount: c._count?.products ?? 0
      }))
    });
  } catch (err) {
    console.warn('[TradeX Categories] Base de dados offline:', err.message);
    return res.json({
      ok: true,
      data: [
        { id: 'cat-1', slug: 'electronica-tecnologia', name: 'Electrónica e Tecnologia', productCount: 0 },
        { id: 'cat-2', slug: 'electrodomesticos', name: 'Electrodomésticos', productCount: 0 },
        { id: 'cat-3', slug: 'casa-mobiliario-decoracao', name: 'Casa, Mobiliário e Decoração', productCount: 0 },
        { id: 'cat-4', slug: 'automovel-acessorios', name: 'Automóvel e Acessórios', productCount: 0 },
        { id: 'cat-5', slug: 'construcao-ferramentas', name: 'Construção e Ferramentas', productCount: 0 },
        { id: 'cat-6', slug: 'desporto-lazer', name: 'Desporto e Lazer', productCount: 0 },
        { id: 'cat-7', slug: 'escritorio-papelaria', name: 'Escritório e Papelaria', productCount: 0 },
        { id: 'cat-8', slug: 'equipamentos-industriais', name: 'Equipamentos Industriais', productCount: 1 },
        { id: 'cat-9', slug: 'negocios', name: 'Negócios', productCount: 0 }
      ]
    });
  }
});

productsRouter.post('/categories', requireStaff, async (req, res) => {
  const input = categoryInputSchema.parse(req.body);
  const baseSlug = slugify(input.slug || input.name);
  if (!baseSlug) {
    return res.status(400).json({ ok: false, message: 'Identificador (slug) inválido.' });
  }

  const existing = await prisma.category.findUnique({ where: { slug: baseSlug } });
  if (existing) {
    return res.status(409).json({ ok: false, message: 'Já existe uma categoria com este identificador (slug).' });
  }

  const cat = await prisma.category.create({
    data: {
      name: input.name.trim(),
      slug: baseSlug
    }
  });

  return res.status(201).json({
    ok: true,
    data: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount: 0
    }
  });
});

productsRouter.patch('/categories/:id', requireStaff, async (req, res) => {
  const { id } = req.params;
  const input = categoryUpdateSchema.parse(req.body);

  const existing = await prisma.category.findFirst({
    where: { OR: [{ id }, { slug: id }] }
  });
  if (!existing) {
    return res.status(404).json({ ok: false, message: 'Categoria não encontrada.' });
  }

  const data = {};
  if (input.name) data.name = input.name.trim();
  if (input.slug !== undefined && input.slug !== null) {
    const newSlug = slugify(input.slug || input.name || existing.name);
    if (!newSlug) return res.status(400).json({ ok: false, message: 'Slug inválido.' });
    if (newSlug !== existing.slug) {
      const conflict = await prisma.category.findUnique({ where: { slug: newSlug } });
      if (conflict && conflict.id !== existing.id) {
        return res.status(409).json({ ok: false, message: 'Já existe outra categoria com este slug.' });
      }
      data.slug = newSlug;
    }
  }

  const updated = await prisma.category.update({
    where: { id: existing.id },
    data,
    include: { _count: { select: { products: true } } }
  });

  return res.json({
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      productCount: updated._count?.products ?? 0
    }
  });
});

productsRouter.delete('/categories/:id', requireStaff, async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.category.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { _count: { select: { products: true } } }
  });
  if (!existing) {
    return res.status(404).json({ ok: false, message: 'Categoria não encontrada.' });
  }

  const count = existing._count?.products ?? 0;
  if (count > 0) {
    return res.status(400).json({
      ok: false,
      message: `Não é possível eliminar a categoria "${existing.name}" porque possui ${count} produto(s) associado(s). Altere primeiro a categoria desses produtos.`
    });
  }

  await prisma.category.delete({ where: { id: existing.id } });
  return res.json({ ok: true, message: 'Categoria eliminada com sucesso.', data: { id: existing.id } });
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

// Aceita URLs http(s) (incluindo Supabase Storage), caminhos relativos e data URIs
const imageUrl = z.string().refine(
  v => /^(https?:\/\/|\/|data:image\/)/i.test(v),
  'URL de imagem inválido.'
);

const productSchema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório.').max(200),
  category: z.string().trim().min(1, 'A categoria é obrigatória.'),
  priceAoa: z.coerce.number().positive('O preço deve ser positivo.'),
  description: z.string().max(5000).optional().nullable(),
  origin: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  moq: z.string().optional().nullable(),
  unit: z.string().optional(),
  specs: z.string().max(1000).optional().nullable(),
  image: imageUrl.optional().nullable(),
  images: z.array(z.object({ url: imageUrl, label: z.string().optional() })).optional(),
  techSpecs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  logistics: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  immediateAvailable: z.boolean().optional(),
  chargeShipping: z.boolean().optional(),
  supplierId: z.string().optional().nullable()
});

const KNOWN_CATEGORIES = {
  'electronica-tecnologia': 'Electrónica e Tecnologia',
  'electrodomesticos': 'Electrodomésticos',
  'casa-mobiliario-decoracao': 'Casa, Mobiliário e Decoração',
  'automovel-acessorios': 'Automóvel e Acessórios',
  'construcao-ferramentas': 'Construção e Ferramentas',
  'desporto-lazer': 'Desporto e Lazer',
  'escritorio-papelaria': 'Escritório e Papelaria',
  'equipamentos-industriais': 'Equipamentos Industriais',
  'negocios': 'Negócios'
};

async function resolveCategoryId(slugOrName) {
  if (!slugOrName) {
    const err = new Error('CATEGORY_REQUIRED');
    err.status = 400;
    throw err;
  }
  const clean = slugOrName.trim();

  // 1. Procura por slug
  let cat = await prisma.category.findUnique({ where: { slug: clean } });
  if (cat) return cat.id;

  // 2. Procura por id (caso venha o UUID da categoria)
  cat = await prisma.category.findUnique({ where: { id: clean } }).catch(() => null);
  if (cat) return cat.id;

  // 3. Procura por nome (insensível a maiúsculas/minúsculas)
  cat = await prisma.category.findFirst({
    where: { name: { equals: clean, mode: 'insensitive' } }
  }).catch(() => null);
  if (cat) return cat.id;

  // 4. Se não existir na base de dados (e.g. BD nova no Supabase), cria automaticamente com upsert
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
  const name = KNOWN_CATEGORIES[slug] || clean.charAt(0).toUpperCase() + clean.slice(1);
  cat = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name }
  });
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
