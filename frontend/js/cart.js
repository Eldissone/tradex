// Carrinho: cópia local em localStorage (funciona sem sessão).
// Com sessão iniciada, auth.js sincroniza com o servidor ao ouvir 'tradex:cart-changed'.

const CART_STORAGE_KEY = 'tradex_cart_items_v1';

function emitChange(source) {
  window.dispatchEvent(new CustomEvent('tradex:cart-changed', { detail: { source } }));
}

export const cartStore = {
  getItems() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // source: 'user' (alteração do utilizador) ou 'server' (veio da sincronização)
  saveItems(items, source = 'user') {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
    emitChange(source);
  },

  addItem(product, quantity = 1) {
    const items = this.getItems();
    const qty = Math.max(1, Number(quantity) || 1);
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({ ...product, quantity: qty });
    }
    this.saveItems(items);
    return items;
  },

  removeItem(index) {
    const items = this.getItems();
    items.splice(index, 1);
    this.saveItems(items);
    return items;
  },

  // Após uma encomenda: limpa local e (via evento) no servidor
  clear() {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}
    emitChange('user');
  },

  // Ao terminar sessão: limpa só a cópia local
  clearLocal() {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}
    emitChange('server');
  },

  formatAoa(value) {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value).replace('AOA', 'Kz');
  }
};
