import { prisma } from './prisma.js';
import { env } from '../../config/env.js';
import { registerAdminInMemory } from '../../presentation/routes/auth.routes.js';

export async function bootstrapAdminUser() {
  const adminEmail = env.ADMIN_EMAIL.trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD;
  const adminFirstName = env.ADMIN_FIRST_NAME;
  const adminLastName = env.ADMIN_LAST_NAME;
  const adminPhone = env.ADMIN_PHONE;

  console.info(`[TradeX Bootstrap] A verificar conta de administrador (${adminEmail})...`);

  // Assegura que a conta configurada no .env fica registada em memória
  registerAdminInMemory({
    email: adminEmail,
    password: adminPassword,
    firstName: adminFirstName,
    lastName: adminLastName,
    phone: adminPhone
  });

  try {
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { customer: true }
    });

    if (existing) {
      console.info(`[TradeX Bootstrap] Conta de administrador já existe na base de dados: ${adminEmail}`);
      return { created: false, user: existing };
    }

    const created = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPassword,
        role: 'ADMIN',
        customer: {
          create: {
            firstName: adminFirstName,
            lastName: adminLastName,
            phone: adminPhone
          }
        }
      },
      include: { customer: true }
    });

    console.info(`[TradeX Bootstrap] ✅ Conta de Administrador criada com sucesso na base de dados a partir do .env! (${adminEmail})`);
    return { created: true, user: created };
  } catch (err) {
    console.warn(`[TradeX Bootstrap] ℹ️ Base de dados offline ou em configuração. Administrador ativo para login imediato com as credenciais do .env.`);
    return { created: false, fallback: true, email: adminEmail };
  }
}

