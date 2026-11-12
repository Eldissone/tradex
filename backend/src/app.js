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

// Em produção, exige HTTPS (o proxy deve enviar X-Forwarded-Proto) e activa HSTS
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure) return next();
    if (req.method === 'GET' || req.method === 'HEAD') return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    return res.status(426).json({ ok: false, message: 'Use HTTPS.' });
  });
}
app.use(helmet({ hsts: { maxAge: 15552000, includeSubDomains: true } }));

const allowedOrigins = [
  ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']),
  env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Pedidos sem Origin (curl, server-to-server) e origens permitidas
    callback(null, !origin || allowedOrigins.includes(origin));
  }
}));

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
