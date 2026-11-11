import { verifyAccessToken } from '../../infrastructure/auth/auth.js';
import { prisma } from '../../infrastructure/database/prisma.js';

function readBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function resolveUser(req) {
  const token = readBearer(req);
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customer: true }
    });
    if (!user || !user.active) return null;
    // Palavra-passe alterada depois de o token ser emitido: sessão revogada
    if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) return null;
    return user;
  } catch {
    return null;
  }
}

// Anexa req.user se houver token válido, sem bloquear (ex.: checkout como convidado)
export async function optionalAuth(req, _res, next) {
  req.user = await resolveUser(req);
  next();
}

export async function requireAuth(req, res, next) {
  req.user = await resolveUser(req);
  if (!req.user) {
    return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Inicie sessão novamente.' });
  }
  next();
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) req.user = await resolveUser(req);
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Inicie sessão novamente.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'Sem permissão para esta operação.' });
    }
    next();
  };
}

export const requireStaff = requireRole('ADMIN', 'STAFF');
export const requireAdmin = requireRole('ADMIN');

export function isStaff(user) {
  return user && (user.role === 'ADMIN' || user.role === 'STAFF');
}
