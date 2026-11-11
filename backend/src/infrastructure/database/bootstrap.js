import { prisma } from './prisma.js';
import { env } from '../../config/env.js';
import { hashPassword } from '../auth/auth.js';

// Cria a conta de administrador definida no .env, se ainda não existir.
export async function bootstrapAdminUser() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.info('[TradeX Bootstrap] ADMIN_EMAIL/ADMIN_PASSWORD não definidos — nenhum administrador criado.');
    return { created: false };
  }

  const email = env.ADMIN_EMAIL.trim().toLowerCase();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== 'ADMIN') {
        console.warn(`[TradeX Bootstrap] ${email} existe mas não é ADMIN; não foi alterado.`);
      }
      return { created: false };
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(env.ADMIN_PASSWORD),
        role: 'ADMIN',
        customer: {
          create: {
            firstName: env.ADMIN_FIRST_NAME,
            lastName: env.ADMIN_LAST_NAME,
            phone: env.ADMIN_PHONE || null
          }
        }
      }
    });

    console.info(`[TradeX Bootstrap] Conta de administrador criada: ${email}`);
    return { created: true };
  } catch (err) {
    console.error('[TradeX Bootstrap] Não foi possível criar o administrador:', err.message);
    return { created: false, error: err.message };
  }
}
