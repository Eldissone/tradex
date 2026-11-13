import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5174,https://tradexglobal-blond.vercel.app'),
  // Nº de proxies de confiança à frente da API (1 = proxy padrão, e.g. Vercel, Railway, Cloudflare).
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  DATABASE_URL: z.string().min(1).default('postgresql://tradex:tradex@localhost:5432/tradex?schema=public'),

  // Autenticação
  JWT_SECRET: z.string().min(32).default('tradex_fallback_jwt_secret_must_be_set_in_production_32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Conta de administrador criada no arranque (sem valores por defeito no código)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_FIRST_NAME: z.string().default('Administrador'),
  ADMIN_LAST_NAME: z.string().default('TradeX'),
  ADMIN_PHONE: z.string().optional(),

  // Seed de desenvolvimento
  SEED_DEMO_CUSTOMER_EMAIL: z.string().email().optional(),
  SEED_DEMO_CUSTOMER_PASSWORD: z.string().min(6).optional(),

  // Endereço público da loja (links em e-mails e mensagens)
  PUBLIC_SITE_URL: z.string().url().optional(),

  // WhatsApp Business Cloud API (vazio = envio simulado / webhook desligado)
  WHATSAPP_ACCESS_TOKEN: z.string().optional().transform(v => v || undefined),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().transform(v => v || undefined),
  WHATSAPP_VERIFY_TOKEN: z.string().optional().transform(v => v || undefined),
  WHATSAPP_APP_SECRET: z.string().optional().transform(v => v || undefined),
  WHATSAPP_GRAPH_VERSION: z.string().default('v21.0'),
  // Modelo aprovado pela Meta para avisos fora da janela de 24h (parâmetros: nome, encomenda, mensagem)
  WHATSAPP_TEMPLATE_ORDER_UPDATE: z.string().optional().transform(v => v || undefined),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('pt_PT'),

  // E-mail (SMTP). Vazio = envio simulado
  SMTP_HOST: z.string().optional().transform(v => v || undefined),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().transform(v => v || undefined),
  SMTP_PASS: z.string().optional().transform(v => v || undefined),
  MAIL_FROM: z.string().default('TradeX Global <no-reply@tradex.ao>'),

  // Assistente IA no WhatsApp (a chave é lida pelo SDK a partir de ANTHROPIC_API_KEY)
  ANTHROPIC_API_KEY: z.string().optional().transform(v => v || undefined),
  ASSISTANT_MODEL: z.string().default('claude-opus-5-5'),
  ASSISTANT_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('low'),

  // Webhook de pagamentos (vazio = desativado)
  PAYMENT_WEBHOOK_SECRET: z.string().optional().transform(v => v || undefined)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Configuração inválida no .env:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
