// TradeX Global Trading - Catálogo carregado da API
// PRODUCTS_DATA começa com os dados estáticos (para a primeira renderização)
// e é substituído, no mesmo array, pelos produtos da base de dados.
import { PRODUCTS_DATA } from './products-data.js';
import { api } from './api.js';

let loadPromise = null;
let loaded = false;

export function loadProducts({ force = false } = {}) {
  if (loaded && !force) return Promise.resolve(PRODUCTS_DATA);
  if (loadPromise && !force) return loadPromise;

  loadPromise = api.products.list().then(res => {
    if (res.ok && Array.isArray(res.data?.data)) {
      PRODUCTS_DATA.splice(0, PRODUCTS_DATA.length, ...res.data.data);
      loaded = true;
      window.dispatchEvent(new CustomEvent('tradex:products-changed'));
    }
    return PRODUCTS_DATA;
  }).finally(() => { loadPromise = null; });

  return loadPromise;
}

export { PRODUCTS_DATA };
