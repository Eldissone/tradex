import { prisma } from './database/prisma.js';
import { SHIPPING_MODES, CARGO_INSURANCE_RATE, DELIVERY_METHODS } from '../config/shipping.js';

export const DEFAULT_SHIPPING_SETTINGS = {
  modes: SHIPPING_MODES,
  cargoInsuranceRate: CARGO_INSURANCE_RATE,
  deliveryMethods: DELIVERY_METHODS
};

export const DEFAULT_BANK_SETTINGS = {
  accountHolder: 'TradeX Global Trading Lda',
  accounts: [
    { bank: 'Banco BFA', iban: 'AO06.0006.0000.4491.0294.1018.4' },
    { bank: 'Banco BAI', iban: 'AO06.0040.0000.9918.2231.1029.0' }
  ]
};

// Fase 1 de pagamentos: só transferência bancária (Multicaixa aguarda licença/gateway)
export const DEFAULT_PAYMENT_SETTINGS = {
  enabledMethods: ['bank_transfer']
};

const DEFAULTS = {
  shipping: DEFAULT_SHIPPING_SETTINGS,
  bank: DEFAULT_BANK_SETTINGS,
  payments: DEFAULT_PAYMENT_SETTINGS
};

export async function getSetting(key) {
  const row = await prisma.setting.findUnique({ where: { key } });
  const fallback = DEFAULTS[key];
  if (!row) return fallback;
  // Mantém chaves por defeito que ainda não existam no registo guardado
  return fallback && typeof fallback === 'object' ? { ...fallback, ...row.value } : row.value;
}

export async function setSetting(key, value) {
  const row = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  return row.value;
}

// Cálculo autoritativo dos custos de uma encomenda (nunca confiar nos valores do cliente)
// freightableSubtotal: parte do subtotal que paga frete e seguro (produtos de aquisição imediata
// marcados como "sem taxa de envio" ficam de fora). Por defeito, todo o subtotal.
export async function computeOrderCosts({ subtotal, freightableSubtotal = subtotal, shippingMode, deliveryMethod }) {
  const s = await getSetting('shipping');
  const mode = s.modes[shippingMode] || s.modes.sea_lcl;
  const freight = Math.round(freightableSubtotal * mode.freightRate);
  const insurance = Math.round((freightableSubtotal + freight) * s.cargoInsuranceRate);
  const deliveryFee = s.deliveryMethods[deliveryMethod]?.feeAoa ?? 0;
  return {
    freight,
    insurance,
    deliveryFee,
    total: subtotal + freight + insurance + deliveryFee,
    transitLabel: `${mode.minDays} a ${mode.maxDays} dias`,
    modeKey: s.modes[shippingMode] ? shippingMode : 'sea_lcl'
  };
}
