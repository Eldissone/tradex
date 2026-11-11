// Configuração única de prazos, frete e entrega no backend.
// Manter alinhado com frontend/js/shipping-config.js até estes valores
// passarem a ser persistidos (modelo Setting, Fase 0 do plano).

export const SHIPPING_MODES = {
  sea_lcl: { label: 'Marítimo', longLabel: 'Marítimo Consolidado', minDays: 30, maxDays: 60, freightRate: 0.08 },
  air_exp: { label: 'Aéreo', longLabel: 'Aéreo Expresso', minDays: 5, maxDays: 15, freightRate: 0.18 }
};

export const CARGO_INSURANCE_RATE = 0.04;

export const DELIVERY_METHODS = {
  pickup: { label: 'Levantamento no Terminal TradeX (Luanda)', feeAoa: 0 },
  delivery_luanda: { label: 'Entrega ao domicílio em Luanda', feeAoa: 15000 },
  delivery_interprovincial: { label: 'Entrega interprovincial', feeAoa: 35000 }
};

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
