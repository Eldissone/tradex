import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './presentation/middlewares/error-handler.js';
import { apiRouter } from './presentation/routes/index.js';
import { auditTrail } from './presentation/middlewares/audit.js';
import { PUBLIC_UPLOADS_ROOT } from './infrastructure/storage/public-uploads.js';

export const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

// Origens configuradas e permitidas (suporta múltiplas separadas por vírgula e limpa barras finais)
const configuredOrigins = (env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://tradexglobal-blond.vercel.app'
];

function isOriginAllowed(origin) {
  if (!origin) return true; // curl, healthchecks, mobile apps, server-to-server
  const clean = origin.replace(/\/$/, '');
  if (defaultOrigins.includes(clean)) return true;
  if (configuredOrigins.includes(clean)) return true;
  // Permite qualquer subdomínio da TradeX na Vercel (previews e produção)
  if (/^https:\/\/tradexglobal[a-zA-Z0-9-]*\.vercel\.app$/.test(clean)) return true;
  if (/^https:\/\/([a-zA-Z0-9-]+\.)?tradex\.ao$/.test(clean)) return true;
  if (/^https:\/\/([a-zA-Z0-9-]+\.)?tradeximportacoes\.com$/.test(clean)) return true;
  // Permite qualquer porta de desenvolvimento local (localhost e 127.0.0.1)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) return true;
  return false;
}

// 1. CORS é sempre o primeiro middleware para garantir que todas as respostas (inclusive preflights) recebam os headers corretos
app.use(cors({
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// 2. Em produção, exige HTTPS (excepto requisições OPTIONS de preflight)
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return res.status(426).json({ ok: false, message: 'Use HTTPS.' });
  });
}
app.use(helmet({ hsts: { maxAge: 15552000, includeSubDomains: true } }));

// rawBody: necessário para validar a assinatura do webhook WhatsApp
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Imagens públicas (produtos, banners): podem ser mostradas pela loja noutra origem
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(PUBLIC_UPLOADS_ROOT, { index: false, dotfiles: 'deny', maxAge: '7d', immutable: true }));
app.use(auditTrail);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
