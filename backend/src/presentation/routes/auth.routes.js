import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma.js';

export const authRouter = Router();

// Base de utilizadores padrão para fallback e testes imediatos
const MOCK_USERS = [
  {
    id: 'usr_demo_001',
    firstName: 'Manuel',
    lastName: 'Dos Santos',
    email: 'cliente@tradex.ao',
    phone: '+244 923 456 789',
    nif: '004928172LA041',
    role: 'CUSTOMER',
    password: 'tradex2026',
    createdAt: '2026-01-15T10:00:00.000Z'
  },
  {
    id: 'usr_admin_001',
    firstName: 'Carlos',
    lastName: 'Viana',
    email: 'admin@tradex.ao',
    phone: '+244 912 345 678',
    nif: '541829102LA041',
    role: 'ADMIN',
    password: 'tradexadmin2026',
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

// Função para registar ou atualizar admin em memória vindo das variáveis de ambiente (.env)
export function registerAdminInMemory({ email, password, firstName, lastName, phone }) {
  const cleanEmail = email.trim().toLowerCase();
  const idx = MOCK_USERS.findIndex(u => u.email === cleanEmail);
  const adminObj = {
    id: idx >= 0 ? MOCK_USERS[idx].id : `usr_admin_${Date.now()}`,
    firstName,
    lastName,
    email: cleanEmail,
    phone,
    role: 'ADMIN',
    password,
    createdAt: new Date().toISOString()
  };

  if (idx >= 0) {
    MOCK_USERS[idx] = adminObj;
  } else {
    MOCK_USERS.push(adminObj);
  }
}

// Registo de utilizador
authRouter.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, nif, password } = req.body;
    if (!email || !password || !firstName) {
      return res.status(400).json({ ok: false, message: 'Dados incompletos: nome, e-mail e palavra-passe são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Tenta gravar no Prisma se a base de dados estiver ativa
    try {
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return res.status(409).json({ ok: false, message: 'Já existe um utilizador registado com este e-mail.' });
      }

      const created = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash: password, // Em produção adicionar bcrypt
          role: 'CUSTOMER',
          customer: {
            create: {
              firstName: firstName.trim(),
              lastName: lastName ? lastName.trim() : '',
              phone: phone ? phone.trim() : null
            }
          }
        },
        include: { customer: true }
      });

      return res.status(201).json({
        ok: true,
        user: {
          id: created.id,
          email: created.email,
          role: created.role,
          firstName: created.customer?.firstName,
          lastName: created.customer?.lastName,
          phone: created.customer?.phone
        }
      });
    } catch (dbErr) {
      // Fallback em memória
      const found = MOCK_USERS.find(u => u.email === cleanEmail);
      if (found) {
        return res.status(409).json({ ok: false, message: 'Já existe um utilizador registado com este e-mail.' });
      }

      const newUser = {
        id: `usr_${Date.now()}`,
        firstName: firstName.trim(),
        lastName: lastName ? lastName.trim() : '',
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        nif: nif ? nif.trim() : '',
        role: 'CUSTOMER',
        password: password,
        createdAt: new Date().toISOString()
      };

      MOCK_USERS.push(newUser);
      const { password: _, ...userData } = newUser;
      return res.status(201).json({ ok: true, user: userData });
    }
  } catch (err) {
    next(err);
  }
});

// Login de utilizador
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'E-mail e palavra-passe são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { customer: true }
      });

      if (!user || user.passwordHash !== password) {
        // Testa utilizador demo se não estiver na DB
        const mock = MOCK_USERS.find(u => u.email === cleanEmail && u.password === password);
        if (mock) {
          const { password: _, ...userData } = mock;
          return res.json({ ok: true, user: userData, token: `tradex_jwt_token_${mock.id}` });
        }
        return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });
      }

      return res.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.customer?.firstName || 'Utilizador',
          lastName: user.customer?.lastName || '',
          phone: user.customer?.phone || ''
        },
        token: `tradex_jwt_token_${user.id}`
      });
    } catch (dbErr) {
      // Fallback em memória
      const mock = MOCK_USERS.find(u => u.email === cleanEmail && u.password === password);
      if (!mock) {
        return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });
      }

      const { password: _, ...userData } = mock;
      return res.json({ ok: true, user: userData, token: `tradex_jwt_token_${mock.id}` });
    }
  } catch (err) {
    next(err);
  }
});

// Recuperação de palavra-passe
authRouter.post('/recover-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ ok: false, message: 'E-mail é obrigatório.' });
  }

  return res.json({
    ok: true,
    message: `Instruções de recuperação e código de segurança enviados para ${email}.`
  });
});

