import { app } from './app.js';
import { env } from './config/env.js';
import { runRetention } from './presentation/middlewares/audit.js';
import { bootstrapAdminUser } from './infrastructure/database/bootstrap.js';

app.listen(env.PORT, async () => {
  console.info(`TradeX API listening on port ${env.PORT}`);
  // Lê as configurações do .env e cria a conta de administrador se não existir
  await bootstrapAdminUser();
  // Retenção diária: auditoria (12 meses) e tokens de recuperação expirados
  runRetention();
  setInterval(runRetention, 24 * 3600 * 1000).unref();
});
