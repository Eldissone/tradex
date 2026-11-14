import { app } from './app.js';
import { env } from './config/env.js';
import { runRetention } from './presentation/middlewares/audit.js';
import { bootstrapAdminUser } from './infrastructure/database/bootstrap.js';

const server = app.listen(env.PORT, async () => {
  console.info(`TradeX API listening on port ${env.PORT}`);
  try {
    await bootstrapAdminUser();
  } catch (err) {
    console.warn('[TradeX Bootstrap] Aviso:', err.message);
  }
  try {
    runRetention();
  } catch (err) {
    console.warn('[Retenção] Aviso:', err.message);
  }
  setInterval(runRetention, 24 * 3600 * 1000).unref();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [TradeX API] A porta ${env.PORT} já está a ser usada por outro processo!`);
    console.error(`👉 Para libertar a porta no PowerShell:`);
    console.error(`   Stop-Process -Name node -Force\n`);
  } else {
    console.error('❌ [TradeX API] Erro no servidor:', err);
  }
});
