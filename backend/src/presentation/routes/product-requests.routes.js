import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../../infrastructure/database/prisma.js';
import { optionalAuth, requireStaff } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import { MAX_IMAGE_BYTES, detectImageType, savePublicImage } from '../../infrastructure/storage/public-uploads.js';

// Pedidos de produtos que ainda não existem no catálogo.
// Público: o cliente envia imagem + descrição opcional. Staff: pesquisa e disponibiliza no sistema.
export const productRequestsRouter = Router();

const STATUSES = ['NEW', 'IN_REVIEW', 'AVAILABLE', 'REJECTED'];

// Endpoint público com upload: limita abuso (a imagem só é aceite aqui, anexada ao pedido)
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Demasiados pedidos a partir desta ligação. Tente novamente mais tarde.'
});
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

const createSchema = z.object({
  name: z.string().trim().min(2, 'Indique o seu nome.').max(120),
  phone: z.string().trim().min(6, 'Indique um telefone ou WhatsApp para contacto.').max(40),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(160).optional().or(z.literal('').transform(() => undefined)),
  description: z.string().trim().max(1500, 'A descrição é demasiado longa.').optional().or(z.literal('').transform(() => undefined))
});

function serialize(r) {
  return {
    id: r.id,
    customerId: r.customerId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    description: r.description,
    imageUrl: r.imageUrl,
    status: r.status,
    adminNote: r.adminNote,
    productId: r.productId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function publicUrl(req, stored) {
  if (/^(https?:|data:)/i.test(stored)) return stored;
  const base = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${stored}`;
}

// Criar pedido (cliente com sessão ou convidado)
productRequestsRouter.post('/', createLimiter, optionalAuth, imageUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, message: 'Anexe uma imagem do produto que procura.' });
  const type = detectImageType(req.file.buffer);
  if (!type) return res.status(400).json({ ok: false, message: 'Formato não suportado. Use JPG, PNG ou WEBP.' });

  const input = createSchema.parse(req.body);

  let stored;
  try {
    stored = await savePublicImage(req.file.buffer, type);
  } catch (err) {
    console.error('[TradeX ProductRequests] Erro ao gravar imagem:', err.message);
    return res.status(500).json({ ok: false, message: 'Não foi possível gravar a imagem. Tente novamente.' });
  }

  const created = await prisma.productRequest.create({
    data: {
      customerId: req.user?.customer?.id ?? null,
      name: input.name,
      phone: input.phone,
      email: input.email ?? req.user?.email ?? null,
      description: input.description ?? null,
      imageUrl: publicUrl(req, stored)
    }
  });
  return res.status(201).json({ ok: true, data: { id: created.id, status: created.status } });
});

// ---- Gestão (staff) ----

productRequestsRouter.get('/', requireStaff, async (req, res) => {
  const status = String(req.query.status || '');
  const items = await prisma.productRequest.findMany({
    where: STATUSES.includes(status) ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 500
  });
  return res.json({ ok: true, total: items.length, data: items.map(serialize) });
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  adminNote: z.string().trim().max(1500).optional().nullable(),
  productId: z.string().trim().max(60).optional().nullable()
});

productRequestsRouter.patch('/:id', requireStaff, async (req, res) => {
  const input = updateSchema.parse(req.body);
  const data = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.adminNote !== undefined) data.adminNote = input.adminNote || null;
  if (input.productId !== undefined) data.productId = input.productId || null;
  const updated = await prisma.productRequest.update({ where: { id: req.params.id }, data });
  return res.json({ ok: true, data: serialize(updated) });
});

productRequestsRouter.delete('/:id', requireStaff, async (req, res) => {
  await prisma.productRequest.delete({ where: { id: req.params.id } });
  return res.json({ ok: true, data: { id: req.params.id, deleted: true } });
});
