// Cart store com persistência em localStorage para partilha entre páginas

const CART_STORAGE_KEY = 'tradex_cart_items_v1';

export const cartStore = {
  getItems() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  },

  addItem(product) {
    const items = this.getItems();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ ...product, quantity: 1 });
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

  clear() {
    localStorage.removeItem(CART_STORAGE_KEY);
  },

  formatAoa(value) {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value).replace('AOA', 'Kz');
  }
};

