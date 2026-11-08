import { Router } from 'express';
import { checkDatabaseConnection } from '../../infrastructure/database/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response) => {
  const dbStatus = await checkDatabaseConnection();
  return response.status(200).json({
    status: 'ok',
    service: 'tradex-api',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus.ok ? 'connected' : 'offline (fallback mode active)',
    timestamp: new Date().toISOString()
  });
});
