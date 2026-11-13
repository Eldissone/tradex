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
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { customer: true }
    });

    if (existing) {
      if (existing.role !== 'ADMIN') {
        console.warn(`[TradeX Bootstrap] ⚠️ ${email} existe mas a sua função não é ADMIN (função actual: ${existing.role}).`);
      } else {
        console.info(`[TradeX Bootstrap] ✅ Administrador verificado e ativo na base de dados: ${email}`);
      }
      return { created: false, user: existing };
    }

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(env.ADMIN_PASSWORD),
        role: 'ADMIN',
        customer: {
          create: {
            firstName: env.ADMIN_FIRST_NAME || 'Administrador',
            lastName: env.ADMIN_LAST_NAME || 'TradeX',
            phone: env.ADMIN_PHONE || null
          }
        }
      },
      include: { customer: true }
    });

    console.info(`[TradeX Bootstrap] 🚀 Nova conta de administrador criada com sucesso na base de dados: ${email}`);
    return { created: true, user: created };
  } catch (err) {
    console.warn('[TradeX Bootstrap] ℹ️ Base de dados offline ou tabelas em migração. Administrador será criado assim que a base de dados estiver ligada.');
    return { created: false, error: err.message };
  }
}
