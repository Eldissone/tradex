import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5174'),
  DATABASE_URL: z.string().min(1).optional(),
  
  // Configuração da Conta de Administrador
  ADMIN_EMAIL: z.string().email().default('admin@tradex.ao'),
  ADMIN_PASSWORD: z.string().min(6).default('tradexadmin2026'),
  ADMIN_FIRST_NAME: z.string().default('Carlos'),
  ADMIN_LAST_NAME: z.string().default('Viana'),
  ADMIN_PHONE: z.string().default('+244 912 345 678'),
});

export const env = schema.parse(process.env);
