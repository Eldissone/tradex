import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './presentation/middlewares/error-handler.js';
import { apiRouter } from './presentation/routes/index.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

