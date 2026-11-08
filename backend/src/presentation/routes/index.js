import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { productsRouter } from './products.routes.js';
import { ordersRouter } from './orders.routes.js';
import { paymentsRouter } from './payments.routes.js';
import { trackingRouter } from './tracking.routes.js';
import { adminRouter } from './admin.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/tracking', trackingRouter);
apiRouter.use('/admin', adminRouter);
