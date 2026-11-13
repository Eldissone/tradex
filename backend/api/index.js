import { app } from '../src/app.js';
import { bootstrapAdminUser } from '../src/infrastructure/database/bootstrap.js';

let bootstrapped = false;

export default async function handler(req, res) {
  if (!bootstrapped) {
    bootstrapped = true;
    bootstrapAdminUser().catch((err) => console.warn('[TradeX Bootstrap] Erro Vercel:', err.message));
  }
  return app(req, res);
}


