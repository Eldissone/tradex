import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { productsRouter } from './products.routes.js';
import { ordersRouter } from './orders.routes.js';
import { paymentsRouter } from './payments.routes.js';
import { trackingRouter } from './tracking.routes.js';
import { adminRouter } from './admin.routes.js';
import { customersRouter } from './customers.routes.js';
import { whatsappRouter } from './whatsapp.routes.js';
import { getSetting } from '../../infrastructure/settings.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/me', customersRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/tracking', trackingRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/webhooks/whatsapp', whatsappRouter);

// Conteúdos públicos (banners, destaques, FAQ) — null se ainda não houver versão guardada
apiRouter.get('/config/cms', async (_req, res) => {
  res.json({ ok: true, data: await getSetting('cms') ?? null });
});

// Prazos e taxas públicos (checkout, produto)
apiRouter.get('/config/shipping', async (_req, res) => {
  res.json({ ok: true, data: await getSetting('shipping') });
});
