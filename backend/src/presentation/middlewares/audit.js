import { prisma } from '../../infrastructure/database/prisma.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SECURITY_STATUSES = new Set([401, 403, 429]);
const SECRET_KEY = /pass|token|secret|authorization|hash/i;
const MAX_DETAILS = 4000;

function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[omitido]' : redact(v, depth + 1)]));
  }
  if (typeof value === 'string' && value.length > 300) return value.slice(0, 300) + '…';
  return value;
}

function details(req) {
  if (!req.body || typeof req.body !== 'object' || !Object.keys(req.body).length) return undefined;
  const text = JSON.stringify(redact(req.body));
  if (text.length > MAX_DETAILS) return { truncated: true };
  return JSON.parse(text);
}

// Regista operações de escrita de staff/admin e eventos de segurança (401/403/429) de qualquer pedido.
// Nunca bloqueia nem falha o pedido.
export function auditTrail(req, res, next) {
  res.on('finish', () => {
    try {
      const user = req.user;
      const staff = user && (user.role === 'ADMIN' || user.role === 'STAFF');
      const security = SECURITY_STATUSES.has(res.statusCode);
      const staffWrite = staff && MUTATING.has(req.method);
      if (!staffWrite && !security) return;

      const path = req.originalUrl.split('?')[0];
      const parts = path.replace(/^\/api\/v1\//, '').split('/').filter(Boolean);
      const first = parts[0] === 'admin' ? parts[1] : parts[0];
      const idx = parts.indexOf(first);
      const route = `${req.baseUrl || ''}${req.route?.path && req.route.path !== '/' ? req.route.path : ''}`;

      prisma.auditLog.create({
        data: {
          actorId: user?.id || null,
          actorEmail: user?.email || null,
          actorRole: user?.role || null,
          action: security && !staffWrite ? `security.${res.statusCode}` : `${req.method} ${route || path}`,
          method: req.method,
          path: path.slice(0, 300),
          entity: first || null,
          entityId: parts[idx + 1] || null,
          status: res.statusCode,
          ip: req.ip || null,
          userAgent: (req.get('user-agent') || '').slice(0, 200) || null,
          details: staffWrite ? details(req) : undefined
        }
      }).catch(err => console.error('[Auditoria] Falha ao registar:', err.message));
    } catch (err) {
      console.error('[Auditoria] Erro:', err.message);
    }
  });
  next();
}

// Eventos de segurança registados à mão (ex.: login falhado)
export function logSecurityEvent(req, action, extra = {}) {
  prisma.auditLog.create({
    data: {
      actorEmail: extra.email || null,
      action,
      method: req.method,
      path: req.originalUrl.split('?')[0].slice(0, 300),
      entity: 'auth',
      status: extra.status || 401,
      ip: req.ip || null,
      userAgent: (req.get('user-agent') || '').slice(0, 200) || null
    }
  }).catch(err => console.error('[Auditoria] Falha ao registar:', err.message));
}

// Retenção: auditoria 12 meses; tokens de recuperação expirados há mais de 7 dias
export async function runRetention() {
  const day = 86400000;
  try {
    const [a, t] = await Promise.all([
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * day) } } }),
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * day) } } })
    ]);
    if (a.count || t.count) console.info(`[Retenção] auditoria: ${a.count}, tokens de recuperação: ${t.count}`);
  } catch (err) {
    console.error('[Retenção] Falhou:', err.message);
  }
}
