// Configuração única de prazos, frete e entrega no backend.
// Manter alinhado com frontend/js/shipping-config.js até estes valores
// passarem a ser persistidos (modelo Setting, Fase 0 do plano).

export const SHIPPING_MODES = {
  sea_lcl: { label: 'Marítimo', longLabel: 'Marítimo Consolidado', minDays: 30, maxDays: 60, freightUnit: 'm3', freightRateAoa: 360 },
  air_exp: { label: 'Aéreo', longLabel: 'Aéreo Expresso', minDays: 5, maxDays: 15, freightUnit: 'kg', freightRateAoa: 35000 }
};

export const CARGO_INSURANCE_RATE = 0.04;

// Mínimo (Kz) de produtos + frete para encomendas de importação (produtos em stock ficam isentos)
export const MIN_ORDER_AOA = 500000;

export const DELIVERY_METHODS = {
  pickup: { label: 'Levantamento no Terminal TradeX (Kilamba, Luanda)', feeAoa: 0 },
  delivery_luanda: { label: 'Entrega ao domicílio em Luanda', feeAoa: 15000 },
  delivery_interprovincial: { label: 'Entrega interprovincial', feeAoa: 35000 }
};

// Frete fixo: aéreo = Kz por kg; marítimo = Kz por m³ (valores ajustáveis no backoffice)
export function computeFreight(mode, lines) {
  const m = getShippingMode(mode);
  const qty = (l) => Number(l.quantity) || 0;
  const measure = m.freightUnit === 'kg'
    ? lines.reduce((a, l) => a + (Number(l.weightKg) || 0) * qty(l), 0)
    : lines.reduce((a, l) => a + (Number(l.volumeM3) || 0) * qty(l), 0);
  return Math.round(measure * (m.freightRateAoa || 0));
}

export function getShippingMode(mode) {
  return SHIPPING_MODES[mode] || SHIPPING_MODES.sea_lcl;
}

export function formatTransitDays(mode) {
  const m = getShippingMode(mode);
  return `${m.minDays} a ${m.maxDays} dias`;
}

export function getDeliveryFee(method) {
  return DELIVERY_METHODS[method]?.feeAoa ?? 0;
}
