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

  // Define a quantidade de uma linha (1 a 99); abaixo de 1 remove a linha
  setQuantity(index, quantity) {
    const items = this.getItems();
    if (!items[index]) return items;
    const qty = Math.floor(Number(quantity) || 0);
    if (qty < 1) items.splice(index, 1);
    else items[index].quantity = Math.min(99, qty);
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

const escText = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// Lista do carrinho (gaveta) com controlo de quantidade; partilhada por todas as páginas
export function renderCartList(listEl, items, onChange) {
  listEl.innerHTML = items.map((item, index) => `
    <li class="cart-item">
      <div class="cart-item-main">
        <h5>${escText(item.title)}</h5>
        <p>${cartStore.formatAoa(item.priceAoa)} / un.</p>
        <div class="cart-qty" role="group" aria-label="Quantidade de ${escText(item.title)}">
          <button type="button" class="cart-qty-btn" data-qty-minus="${index}" aria-label="Diminuir quantidade" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
          <input type="number" class="cart-qty-input" data-qty-input="${index}" value="${item.quantity}" min="1" max="99" aria-label="Quantidade" />
          <button type="button" class="cart-qty-btn" data-qty-plus="${index}" aria-label="Aumentar quantidade" ${item.quantity >= 99 ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <strong>${cartStore.formatAoa(item.priceAoa * item.quantity)}</strong><br>
        <button type="button" class="btn-cart-remove" data-remove="${index}">Remover</button>
      </div>
    </li>`).join('');

  const apply = (fn) => { fn(); onChange(); };
  listEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => apply(() => cartStore.removeItem(parseInt(btn.dataset.remove, 10))));
  });
  listEl.querySelectorAll('[data-qty-minus]').forEach(btn => {
    const i = parseInt(btn.dataset.qtyMinus, 10);
    btn.addEventListener('click', () => apply(() => cartStore.setQuantity(i, (cartStore.getItems()[i]?.quantity || 1) - 1)));
  });
  listEl.querySelectorAll('[data-qty-plus]').forEach(btn => {
    const i = parseInt(btn.dataset.qtyPlus, 10);
    btn.addEventListener('click', () => apply(() => cartStore.setQuantity(i, (cartStore.getItems()[i]?.quantity || 1) + 1)));
  });
  listEl.querySelectorAll('[data-qty-input]').forEach(input => {
    const i = parseInt(input.dataset.qtyInput, 10);
    input.addEventListener('change', () => apply(() => cartStore.setQuantity(i, Math.max(1, parseInt(input.value, 10) || 1))));
  });
}
