// TradeX Global Trading - Prazos, frete e entrega
// Valores por defeito para a primeira renderização. loadShippingConfig() substitui-os
// pelos valores definidos no backoffice (GET /config/shipping).
import { api } from './api.js';

export const SHIPPING_MODES = {
  sea_lcl: {
    label: 'Marítimo',
    longLabel: 'Marítimo Consolidado',
    minDays: 30,
    maxDays: 60,
    freightUnit: 'm3',
    freightRateAoa: 360
  },
  air_exp: {
    label: 'Aéreo',
    longLabel: 'Aéreo Expresso',
    minDays: 5,
    maxDays: 15,
    freightUnit: 'kg',
    freightRateAoa: 35000
  }
};

// Seguro de carga sobre (subtotal + frete)
export let CARGO_INSURANCE_RATE = 0.04;

// Mínimo de produtos + frete para encomendas de importação
export let MIN_ORDER_AOA = 500000;

export const DELIVERY_METHODS = {
  pickup: { label: 'Levantamento no Terminal TradeX (Kilamba, Luanda)', feeAoa: 0 },
  delivery_luanda: { label: 'Entrega ao domicílio em Luanda', feeAoa: 15000 },
  delivery_interprovincial: { label: 'Entrega interprovincial', feeAoa: 35000 }
};

export function getShippingMode(mode) {
  return SHIPPING_MODES[mode] || SHIPPING_MODES.sea_lcl;
}

// Frete fixo: aéreo = Kz por kg; marítimo = Kz por m³. items: { weightKg, volumeM3, quantity }
export function computeFreight(mode, items) {
  const m = getShippingMode(mode);
  const key = m.freightUnit === 'kg' ? 'weightKg' : 'volumeM3';
  const measure = items.reduce((a, i) => a + (Number(i[key]) || 0) * (Number(i.quantity) || 0), 0);
  return Math.round(measure * (m.freightRateAoa || 0));
}

export function formatTransitDays(mode) {
  const m = getShippingMode(mode);
  return `${m.minDays} a ${m.maxDays} dias`;
}

export function getDeliveryFee(method) {
  return DELIVERY_METHODS[method]?.feeAoa ?? 0;
}

let loadPromise = null;
export function loadShippingConfig() {
  if (loadPromise) return loadPromise;
  loadPromise = api.config.shipping().then(res => {
    const cfg = res.ok ? res.data?.data : null;
    if (cfg) {
      Object.assign(SHIPPING_MODES, cfg.modes || {});
      Object.assign(DELIVERY_METHODS, cfg.deliveryMethods || {});
      if (typeof cfg.minOrderAoa === 'number') MIN_ORDER_AOA = cfg.minOrderAoa;
      if (typeof cfg.cargoInsuranceRate === 'number') CARGO_INSURANCE_RATE = cfg.cargoInsuranceRate;
      window.dispatchEvent(new CustomEvent('tradex:shipping-config-changed'));
    }
    return cfg;
  });
  return loadPromise;
}
