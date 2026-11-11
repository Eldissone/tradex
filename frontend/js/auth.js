// TradeX Global Trading - Sessão do utilizador e dados da conta
// A API é a fonte de verdade. O localStorage guarda apenas uma cópia em cache
// para que as páginas possam ler os dados de forma síncrona enquanto sincronizam.
import { api, tokenStore } from './api.js';
import { cartStore } from './cart.js';

const AUTH_STORAGE_KEY = 'tradex_auth_user_v2';
const CACHE_KEYS = {
  orders: 'tradex_cache_orders_v2',
  payments: 'tradex_cache_payments_v2',
  addresses: 'tradex_cache_addresses_v2',
  favorites: 'tradex_cache_favorites_v2'
};
const LAST_ORDER_KEY = 'tradex_last_order_v2';

// Remove dados antigos guardados localmente pela versão sem backend
const LEGACY_KEYS = [
  'tradex_auth_user_v1', 'tradex_registered_users_v1', 'tradex_user_addresses_v1',
  'tradex_orders_history_v1', 'tradex_user_favorites_v1', 'tradex_payments_history_v1'
];
try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch {}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

let syncPromise = null;

export const authStore = {
  // ---- Sessão ----
  getUser() {
    return tokenStore.get() ? readJson(AUTH_STORAGE_KEY, null) : null;
  },

  isLoggedIn() {
    return this.getUser() !== null;
  },

  isStaff() {
    const role = this.getUser()?.role;
    return role === 'ADMIN' || role === 'STAFF';
  },

  setSession(user, token) {
    if (token) tokenStore.set(token);
    writeJson(AUTH_STORAGE_KEY, user);
    this.notifyAuthChange();
  },

  clearSession({ keepCart = false } = {}) {
    const hadSession = Boolean(tokenStore.get());
    tokenStore.set(null);
    writeJson(AUTH_STORAGE_KEY, null);
    Object.values(CACHE_KEYS).forEach(k => writeJson(k, null));
    // O carrinho fica guardado na conta; neste browser volta a ficar vazio
    if (hadSession && !keepCart) cartStore.clearLocal();
  },

  async login(email, password) {
    const res = await api.auth.login(email, password);
    if (!res.ok) return { ok: false, message: res.message };
    this.setSession(res.data.user, res.data.token);
    await this.sync();
    return { ok: true, user: res.data.user };
  },

  async register({ firstName, lastName, email, phone, password }) {
    const res = await api.auth.register({ firstName, lastName, email, phone, password });
    if (!res.ok) return { ok: false, message: res.message };
    this.setSession(res.data.user, res.data.token);
    await this.sync();
    return { ok: true, user: res.data.user };
  },

  async recoverPassword(email) {
    const res = await api.auth.recoverPassword(email);
    return { ok: res.ok, message: res.message };
  },

  async updateProfile(data) {
    const res = await api.auth.updateProfile(data);
    if (!res.ok) return { ok: false, message: res.message };
    // Ao mudar a palavra-passe, as sessões antigas são revogadas e chega um token novo
    if (res.data.token) tokenStore.set(res.data.token);
    writeJson(AUTH_STORAGE_KEY, res.data.user);
    this.notifyAuthChange();
    return { ok: true, user: res.data.user };
  },

  logout() {
    this.clearSession();
    this.notifyAuthChange();
    window.location.reload();
  },

  // Confirma a sessão junto da API e actualiza as caches
  async sync() {
    if (!tokenStore.get()) return;
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
      const me = await api.auth.me();
      if (!me.ok) {
        if (me.status === 401) {
          this.clearSession();
          this.notifyAuthChange();
        }
        return;
      }
      writeJson(AUTH_STORAGE_KEY, me.data.user);

      const [orders, payments, addresses, favorites, cart] = await Promise.all([
        api.orders.list(),
        api.payments.list(),
        api.me.addresses(),
        api.me.favorites(),
        api.me.cart()
      ]);
      if (cart.ok) await mergeServerCart(cart.data.data.items);
      if (orders.ok) { writeJson(CACHE_KEYS.orders, orders.data.data); emit('tradex:orders-changed'); }
      if (payments.ok) { writeJson(CACHE_KEYS.payments, payments.data.data); emit('tradex:payments-changed'); }
      if (addresses.ok) writeJson(CACHE_KEYS.addresses, addresses.data.data);
      if (favorites.ok) writeJson(CACHE_KEYS.favorites, favorites.data.data);
      emit('tradex:account-synced');
    })().finally(() => { syncPromise = null; });

    return syncPromise;
  },

  // ---- Moradas ----
  getAddresses() {
    return this.isLoggedIn() ? readJson(CACHE_KEYS.addresses, []) : [];
  },

  async saveAddress(address) {
    const res = await api.me.addAddress(address);
    if (!res.ok) return { ok: false, message: res.message };
    const list = await api.me.addresses();
    if (list.ok) writeJson(CACHE_KEYS.addresses, list.data.data);
    return { ok: true, address: res.data.data };
  },

  // ---- Encomendas ----
  getOrders() {
    return this.isLoggedIn() ? readJson(CACHE_KEYS.orders, []) : [];
  },

  getOrderById(idOrNumber) {
    const last = readJson(LAST_ORDER_KEY, null);
    const list = this.getOrders();
    return list.find(o => o.id === idOrNumber || o.number === idOrNumber) ||
      (last && (last.id === idOrNumber || last.number === idOrNumber) ? last : null);
  },

  // Guarda na cache a versão devolvida pela API
  cacheOrder(order) {
    if (!order) return order;
    if (this.isLoggedIn()) {
      const list = this.getOrders();
      const idx = list.findIndex(o => o.id === order.id);
      if (idx >= 0) list[idx] = order; else list.unshift(order);
      writeJson(CACHE_KEYS.orders, list);
    }
    const last = readJson(LAST_ORDER_KEY, null);
    if (!last || last.id === order.id || !this.isLoggedIn()) writeJson(LAST_ORDER_KEY, order);
    emit('tradex:orders-changed', order);
    return order;
  },

  async refreshPayments() {
    const res = await api.payments.list();
    if (res.ok) {
      writeJson(CACHE_KEYS.payments, res.data.data);
      emit('tradex:payments-changed');
    }
  },

  // ---- Pagamentos ----
  getPayments() {
    return this.isLoggedIn() ? readJson(CACHE_KEYS.payments, []) : [];
  },

  // ---- Favoritos ----
  getFavorites() {
    return this.isLoggedIn() ? readJson(CACHE_KEYS.favorites, []) : [];
  },

  async toggleFavorite(productId) {
    if (!this.isLoggedIn()) return { ok: false, message: 'Inicie sessão para guardar favoritos.' };
    const res = await api.me.toggleFavorite(productId);
    if (res.ok) writeJson(CACHE_KEYS.favorites, res.data.data);
    return { ok: res.ok, favorites: this.getFavorites(), message: res.message };
  },

  notifyAuthChange() {
    emit('tradex:auth-changed', this.getUser());
  }
};

// ---- Carrinho na conta ----
// Junta o carrinho deste browser (ex.: feito antes de iniciar sessão) com o guardado na conta.
async function mergeServerCart(serverItems) {
  const local = cartStore.getItems();
  const byId = new Map(serverItems.map(i => [i.id, { ...i }]));
  let changed = false;
  for (const item of local) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      changed = true;
    } else if (item.quantity > current.quantity) {
      current.quantity = item.quantity;
      changed = true;
    }
  }
  const merged = [...byId.values()];
  cartStore.saveItems(merged, 'server');
  if (changed) await pushCart(merged);
}

function pushCart(items) {
  return api.me.saveCart(items.map(i => ({ id: i.id, quantity: i.quantity })));
}

let cartTimer = null;
window.addEventListener('tradex:cart-changed', (e) => {
  if (e.detail?.source !== 'user' || !authStore.isLoggedIn()) return;
  clearTimeout(cartTimer);
  cartTimer = setTimeout(() => pushCart(cartStore.getItems()), 600);
});

// Sessão expirada em qualquer pedido: limpa os dados locais
window.addEventListener('tradex:session-expired', () => {
  if (authStore.getUser()) {
    authStore.clearSession();
    authStore.notifyAuthChange();
  }
});

// Configuração do Modal Global de Autenticação
export function setupGlobalAuthModal() {
  let modal = document.getElementById('authModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <div class="auth-modal-header">
          <div class="auth-modal-brand">
            <span class="auth-brand-name">TRADEX<span>GLOBAL</span></span>
            <span class="auth-brand-tag">Área do Cliente</span>
          </div>
          <button type="button" class="btn-close-modal" id="closeAuthModalBtn" aria-label="Fechar Modal">✕</button>
        </div>

        <!-- Abas do Modal -->
        <div class="auth-modal-tabs" role="tablist">
          <button type="button" class="auth-tab active" data-tab="login" role="tab" aria-selected="true">Iniciar Sessão</button>
          <button type="button" class="auth-tab" data-tab="register" role="tab" aria-selected="false">Criar Conta</button>
        </div>

        <!-- Conteúdo: Aba Login -->
        <div class="auth-tab-content active" id="authTabLogin">
          <form id="loginForm" class="auth-form">
            <div class="auth-form-group">
              <label for="loginEmail">E-mail</label>
              <input type="email" id="loginEmail" class="auth-input" placeholder="exemplo@empresa.ao" required autocomplete="email" />
            </div>
            <div class="auth-form-group">
              <div class="label-with-link">
                <label for="loginPassword">Palavra-passe</label>
                <button type="button" class="btn-text-link" id="btnForgotPass">Esqueceu-se?</button>
              </div>
              <input type="password" id="loginPassword" class="auth-input" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <div class="auth-feedback" id="loginFeedback"></div>
            <button type="submit" class="btn-dark btn-full auth-submit-btn">
              <span>Entrar na Minha Conta</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </form>
        </div>

        <!-- Conteúdo: Aba Registo -->
        <div class="auth-tab-content" id="authTabRegister">
          <form id="registerForm" class="auth-form">
            <div class="auth-form-row">
              <div class="auth-form-group">
                <label for="regFirstName">Nome</label>
                <input type="text" id="regFirstName" class="auth-input" placeholder="Seu nome" required autocomplete="given-name" />
              </div>
              <div class="auth-form-group">
                <label for="regLastName">Apelido</label>
                <input type="text" id="regLastName" class="auth-input" placeholder="Sobrenome" required autocomplete="family-name" />
              </div>
            </div>
            <div class="auth-form-group">
              <label for="regEmail">E-mail Profissional / Pessoal</label>
              <input type="email" id="regEmail" class="auth-input" placeholder="seuemail@empresa.ao" required autocomplete="email" />
            </div>
            <div class="auth-form-group">
              <label for="regPhone">Telefone de Contacto (Angola)</label>
              <input type="tel" id="regPhone" class="auth-input" placeholder="+244 9xx xxx xxx" required autocomplete="tel" />
            </div>
            <div class="auth-form-group">
              <label for="regPassword">Criar Palavra-passe</label>
              <input type="password" id="regPassword" class="auth-input" placeholder="Mínimo 8 caracteres" required minlength="8" autocomplete="new-password" />
            </div>
            <div class="auth-feedback" id="registerFeedback"></div>
            <button type="submit" class="btn-dark btn-full auth-submit-btn">
              <span>Criar Conta TradeX</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
          </form>
        </div>

        <!-- Conteúdo: Recuperação de Palavra-passe -->
        <div class="auth-tab-content" id="authTabRecovery">
          <form id="recoveryForm" class="auth-form">
            <p class="auth-form-desc">
              Insira o e-mail associado à sua conta TradeX. Enviaremos um link de recuperação com validação segura.
            </p>
            <div class="auth-form-group">
              <label for="recoverEmail">E-mail</label>
              <input type="email" id="recoverEmail" class="auth-input" placeholder="seuemail@empresa.ao" required autocomplete="email" />
            </div>
            <div class="auth-feedback" id="recoveryFeedback"></div>
            <button type="submit" class="btn-dark btn-full auth-submit-btn">
              <span>Enviar Código de Recuperação</span>
            </button>
            <div class="auth-back-action">
              <button type="button" class="btn-text-link" id="btnBackToLogin">&larr; Voltar ao Início de Sessão</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Elementos do Modal
  const closeBtn = document.getElementById('closeAuthModalBtn');
  const tabs = modal.querySelectorAll('.auth-tab');
  const tabContents = modal.querySelectorAll('.auth-tab-content');
  const btnForgot = document.getElementById('btnForgotPass');
  const btnBackLogin = document.getElementById('btnBackToLogin');

  function openModal(initialTab = 'login') {
    modal.classList.add('visible');
    switchTab(initialTab);
  }
  openAuthModalImpl = openModal;

  function closeModal() {
    modal.classList.remove('visible');
  }

  function switchTab(tabName) {
    tabs.forEach(t => {
      const match = t.getAttribute('data-tab') === tabName;
      t.classList.toggle('active', match);
      t.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    tabContents.forEach(c => {
      if (c.id === `authTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      if (tabName) switchTab(tabName);
    });
  });

  btnForgot?.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    document.getElementById('authTabRecovery')?.classList.add('active');
  });

  btnBackLogin?.addEventListener('click', () => switchTab('login'));


  function setBusy(form, busy) {
    const btn = form?.querySelector('button[type="submit"]');
    if (btn) btn.disabled = busy;
  }

  // Submissão do Formulário de Login
  const loginForm = document.getElementById('loginForm');
  const loginFeedback = document.getElementById('loginFeedback');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value;
    const pass = document.getElementById('loginPassword')?.value;

    setBusy(loginForm, true);
    const result = await authStore.login(email, pass);
    setBusy(loginForm, false);
    if (result.ok) {
      if (loginFeedback) {
        loginFeedback.className = 'auth-feedback success visible';
        loginFeedback.textContent = `Sessão iniciada com sucesso. Olá, ${result.user.firstName}!`;
      }
      setTimeout(() => {
        closeModal();
        updateHeaderUserUi();
      }, 900);
    } else {
      if (loginFeedback) {
        loginFeedback.className = 'auth-feedback error visible';
        loginFeedback.textContent = result.message;
      }
    }
  });

  // Submissão do Formulário de Registo
  const regForm = document.getElementById('registerForm');
  const regFeedback = document.getElementById('registerFeedback');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName')?.value;
    const lastName = document.getElementById('regLastName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const password = document.getElementById('regPassword')?.value;

    setBusy(regForm, true);
    const result = await authStore.register({ firstName, lastName, email, phone, password });
    setBusy(regForm, false);
    if (result.ok) {
      if (regFeedback) {
        regFeedback.className = 'auth-feedback success visible';
        regFeedback.textContent = `Conta criada com sucesso! Bem-vindo(a), ${result.user.firstName}.`;
      }
      setTimeout(() => {
        closeModal();
        updateHeaderUserUi();
      }, 1000);
    } else {
      if (regFeedback) {
        regFeedback.className = 'auth-feedback error visible';
        regFeedback.textContent = result.message;
      }
    }
  });

  // Submissão do Formulário de Recuperação
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryFeedback = document.getElementById('recoveryFeedback');
  recoveryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recoverEmail')?.value;
    setBusy(recoveryForm, true);
    const result = await authStore.recoverPassword(email);
    setBusy(recoveryForm, false);

    if (recoveryFeedback) {
      recoveryFeedback.className = `auth-feedback ${result.ok ? 'success' : 'error'} visible`;
      recoveryFeedback.textContent = result.message;
    }
  });

  // Configuração do Botão de Usuário do Header (#headerUserBtn)
  setupHeaderUserButton(openModal);
}

// Configuração do Botão do Usuário no Header
function setupHeaderUserButton(openModalCallback) {
  const userBtn = document.getElementById('headerUserBtn');
  if (!userBtn) return;

  // Cria Popover de Usuário Logado se não existir
  let userPopover = document.getElementById('userMenuPopover');
  if (!userPopover) {
    userPopover = document.createElement('div');
    userPopover.id = 'userMenuPopover';
    userPopover.className = 'user-menu-popover';
    document.body.appendChild(userPopover);
  }

  function renderUserPopover() {
    const user = authStore.getUser();
    if (!user) return;

    userPopover.innerHTML = `
      <div class="user-popover-header">
        <div class="user-avatar-circle">
          ${user.firstName.charAt(0)}${user.lastName ? user.lastName.charAt(0) : ''}
        </div>
        <div class="user-popover-info">
          <strong class="user-popover-name">${user.firstName} ${user.lastName || ''}</strong>
          <span class="user-popover-email">${user.email}</span>
        </div>
      </div>
      <div class="user-popover-links">
        <a href="cliente" class="user-popover-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Painel do Cliente & Encomendas</span>
        </a>
        <a href="checkout" class="user-popover-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          <span>Finalizar Compra / Checkout</span>
        </a>
        <a href="rastreio" class="user-popover-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Acompanhar Encomendas</span>
        </a>
        ${authStore.isStaff() ? `<a href="admin" class="user-popover-item admin-portal-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <span>Acesso ao Backoffice &rarr;</span>
        </a>` : ''}
      </div>
      <div class="user-popover-footer">
        <button type="button" class="btn-logout-action" id="btnLogoutUser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span>Terminar Sessão</span>
        </button>
      </div>
    `;

    document.getElementById('btnLogoutUser')?.addEventListener('click', () => {
      userPopover.classList.remove('visible');
      authStore.logout();
    });
  }

  userBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (authStore.isLoggedIn()) {
      renderUserPopover();
      userPopover.classList.toggle('visible');
    } else {
      openModalCallback('login');
    }
  });

  document.addEventListener('click', (e) => {
    if (!userBtn.contains(e.target) && !userPopover.contains(e.target)) {
      userPopover.classList.remove('visible');
    }
  });

  updateHeaderUserUi();
}

export function updateHeaderUserUi() {
  const userBtn = document.getElementById('headerUserBtn');
  if (!userBtn) return;

  const user = authStore.getUser();
  if (user) {
    userBtn.classList.add('user-active-logged');
    userBtn.setAttribute('title', `Sessão ativa: ${user.firstName} ${user.lastName}`);
  } else {
    userBtn.classList.remove('user-active-logged');
    userBtn.setAttribute('title', 'Iniciar Sessão / Criar Conta');
  }
}

// Abre o modal de autenticação a partir de outras páginas (ex.: área do cliente)
let openAuthModalImpl = null;
export function openAuthModal(tab = 'login') {
  if (!openAuthModalImpl) setupGlobalAuthModal();
  openAuthModalImpl?.(tab);
}

// Inicialização automática ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalAuthModal();
  authStore.sync();
});

window.addEventListener('tradex:auth-changed', updateHeaderUserUi);
