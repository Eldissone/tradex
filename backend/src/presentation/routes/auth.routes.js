import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import {
  hashPassword,
  verifyPassword,
  DUMMY_HASH,
  signAccessToken,
  createResetToken,
  hashResetToken
} from '../../infrastructure/auth/auth.js';
import { requireAuth } from '../middlewares/auth.js';
import { env } from '../../config/env.js';
import { sendPasswordResetEmail } from '../../infrastructure/notifications/index.js';
import { emailConfigured } from '../../infrastructure/notifications/email.js';
import { serializeUser } from '../serializers.js';
import { logSecurityEvent } from '../middlewares/audit.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import { bootstrapAdminUser } from '../../infrastructure/database/bootstrap.js';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const recoveryLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

export const authRouter = Router();

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'O nome é obrigatório.'),
  lastName: z.string().trim().optional().default(''),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  phone: z.string().trim().optional(),
  nif: z.string().trim().optional(),
  password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.')
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  password: z.string().min(1, 'A palavra-passe é obrigatória.')
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function sessionResponse(user) {
  return { ok: true, user: serializeUser(user), token: signAccessToken(user) };
}

// Registo de cliente
authRouter.post('/register', authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ ok: false, message: 'Já existe uma conta registada com este e-mail.' });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: 'CUSTOMER',
        lastLoginAt: new Date(),
        customer: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone || null,
            nif: data.nif || null
          }
        }
      },
      include: { customer: true }
    });

    // Associa encomendas feitas como convidado com o mesmo e-mail
    await prisma.order.updateMany({
      where: { customerId: null, customerEmail: data.email },
      data: { customerId: user.customer.id }
    });

    return res.status(201).json(sessionResponse(user));
  } catch (err) {
    console.error('[TradeX Auth] Erro ao registar utilizador:', err.message);
    return res.status(503).json({
      ok: false,
      message: 'Base de dados indisponível em produção. Verifique a variável DATABASE_URL nas configurações da Vercel.'
    });
  }
});

// Início de sessão
authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { email }, include: { customer: true } });
    
    // Se o utilizador não existir mas corresponder ao e-mail de administrador configurado no .env, garante o bootstrap
    if (!user && env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase()) {
      await bootstrapAdminUser();
      user = await prisma.user.findUnique({ where: { email }, include: { customer: true } });
    }
  } catch (err) {
    console.error('[TradeX Auth] Erro ao aceder à base de dados no login:', err.message);
    return res.status(503).json({
      ok: false,
      message: 'Base de dados indisponível em produção. Verifique a variável DATABASE_URL nas configurações da Vercel.'
    });
  }

  if (!user) await verifyPassword(password, DUMMY_HASH);
  const valid = user && user.active && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    logSecurityEvent(req, 'auth.login_failed', { email });
    return res.status(401).json({ ok: false, message: 'E-mail ou palavra-passe incorretos.' });
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  } catch (err) {
    console.warn('[TradeX Auth] Não foi possível atualizar lastLoginAt:', err.message);
  }

  return res.json(sessionResponse(user));
});

// Sessão actual
authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ ok: true, user: serializeUser(req.user) });
});

// Actualização do perfil (e, opcionalmente, da palavra-passe)
const profileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  nif: z.string().trim().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'A nova palavra-passe deve ter pelo menos 8 caracteres.').optional()
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const data = profileSchema.parse(req.body);
  const userUpdate = {};

  if (data.newPassword) {
    const ok = await verifyPassword(data.currentPassword || '', req.user.passwordHash);
    if (!ok) {
      return res.status(400).json({ ok: false, message: 'A palavra-passe actual está incorreta.' });
    }
    userUpdate.passwordHash = await hashPassword(data.newPassword);
    userUpdate.passwordChangedAt = new Date();
  }

  const customerData = {
    ...(data.firstName !== undefined && { firstName: data.firstName }),
    ...(data.lastName !== undefined && { lastName: data.lastName }),
    ...(data.phone !== undefined && { phone: data.phone || null }),
    ...(data.nif !== undefined && { nif: data.nif || null })
  };

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...userUpdate,
      customer: req.user.customer
        ? { update: customerData }
        : { create: { firstName: data.firstName || '', lastName: data.lastName || '', phone: data.phone || null, nif: data.nif || null } }
    },
    include: { customer: true }
  });

  return res.json({ ok: true, user: serializeUser(user), ...(data.newPassword ? { token: signAccessToken(user) } : {}) });
});

// Pedido de recuperação de palavra-passe.
// Responde sempre da mesma forma para não revelar se o e-mail existe.
authRouter.post('/recover-password', recoveryLimiter, async (req, res) => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email('E-mail inválido.') }).parse(req.body);
  const genericMessage = `Se existir uma conta com ${email}, enviámos instruções de recuperação.`;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.active) {
    const { token, tokenHash } = createResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) }
    });
    const link = `${(env.PUBLIC_SITE_URL || env.CORS_ORIGIN).replace(/\/$/, '')}/redefinir-password?token=${token}`;
    await sendPasswordResetEmail(email, link);
    // Sem SMTP configurado (desenvolvimento), o link aparece no log do servidor
    if (!emailConfigured() && process.env.NODE_ENV !== 'production') {
      console.info(`[TradeX] Link de recuperação para ${email}: ${link}`);
    }
  }

  return res.json({ ok: true, message: genericMessage });
});

// Redefinição com o token recebido
authRouter.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = z.object({
    token: z.string().min(1),
    password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.')
  }).parse(req.body);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ ok: false, message: 'Link de recuperação inválido ou expirado.' });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);

  return res.json({ ok: true, message: 'Palavra-passe redefinida com sucesso. Já pode iniciar sessão.' });
});
