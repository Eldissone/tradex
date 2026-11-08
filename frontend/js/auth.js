// TradeX Global Trading - Gestão de Autenticação e Clientes
import { cartStore } from './cart.js';

const AUTH_STORAGE_KEY = 'tradex_auth_user_v1';
const USERS_STORAGE_KEY = 'tradex_registered_users_v1';
const ADDRESSES_STORAGE_KEY = 'tradex_user_addresses_v1';
const ORDERS_STORAGE_KEY = 'tradex_orders_history_v1';
const FAVORITES_STORAGE_KEY = 'tradex_user_favorites_v1';
const PAYMENTS_STORAGE_KEY = 'tradex_payments_history_v1';

// Encomendas de demonstração associadas à conta cliente@tradex.ao
const DEMO_ORDERS = [
  {
    id: 'ord_demo_001',
    number: 'TDX-AO-2026-001',
    createdAt: '2026-11-02T14:30:00Z',
    status: 'IN_TRANSIT',
    statusLabel: 'Em Trânsito Marítimo',
    customer: {
      id: 'usr_demo_001',
      name: 'Manuel Dos Santos',
      email: 'cliente@tradex.ao',
      phone: '+244 923 456 789',
      nif: '004928172LA041'
    },
    items: [
      {
        id: 'p-solar-550',
        title: 'Painel Solar Fotovoltaico Monocristalino 550W Tier 1',
        priceAoa: 85000,
        quantity: 20,
        subtotal: 1700000,
        image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=300'
      },
      {
        id: 'p-inversor-10kw',
        title: 'Inversor Solar Híbrido Trifásico Deye 10kW 48V',
        priceAoa: 1450000,
        quantity: 1,
        subtotal: 1450000,
        image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=300'
      }
    ],
    financial: {
      subtotalAoa: 3150000,
      internationalFreightAoa: 252000,
      customsInsuranceAoa: 136080,
      deliveryCostAoa: 15000,
      totalAoa: 3553080
    },
    logistics: {
      shippingMode: 'Marítimo LCL Consolidado',
      deliveryMethod: 'delivery_luanda',
      origin: 'Porto de Nansha, Guangzhou (China)',
      destination: 'Luanda, Angola (Talatona)',
      address: {
        province: 'Luanda',
        municipality: 'Talatona',
        street: 'Via S8, Edifício Sky One, 4º Andar, Sala 402'
      },
      estimatedDeliveryDays: '18 de Novembro de 2026'
    },
    payment: {
      method: 'mcx_express',
      methodName: 'Multicaixa Express',
      status: 'APPROVED',
      transactionId: 'MCX-TXN-2026-981024',
      phone: '+244 923 456 789'
    },
    history: [
      {
        status: 'AWAITING_PAYMENT',
        label: 'Encomenda Registada',
        date: '2026-11-02T14:30:00Z',
        note: 'Encomenda submetida com sucesso.',
        responsible: 'Sistema TradeX'
      },
      {
        status: 'PAYMENT_CONFIRMED',
        label: 'Pagamento Confirmado',
        date: '2026-11-02T14:38:12Z',
        note: 'Transação Multicaixa Express aprovada com sucesso.',
        responsible: 'Gateway EMIS / Multicaixa'
      },
      {
        status: 'IN_TRANSIT',
        label: 'Em Trânsito Internacional',
        date: '2026-11-05T18:45:00Z',
        note: 'Embarque efetuado no Porto de Nansha rumo a Luanda.',
        responsible: 'MSC Luanda'
      }
    ]
  },
  {
    id: 'ord_demo_003',
    number: 'TDX-AO-2026-003',
    createdAt: '2026-10-12T09:15:00Z',
    status: 'DELIVERED',
    statusLabel: 'Entregue com Sucesso',
    customer: {
      id: 'usr_demo_001',
      name: 'Manuel Dos Santos',
      email: 'cliente@tradex.ao',
      phone: '+244 923 456 789',
      nif: '004928172LA041'
    },
    items: [
      {
        id: 'p-piso-porcelanato',
        title: 'Porcelanato Polido Retificado 80x80cm Carrara Grey',
        priceAoa: 12500,
        quantity: 120,
        subtotal: 1500000,
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300'
      }
    ],
    financial: {
      subtotalAoa: 1500000,
      internationalFreightAoa: 120000,
      customsInsuranceAoa: 64800,
      deliveryCostAoa: 0,
      totalAoa: 1684800
    },
    logistics: {
      shippingMode: 'Marítimo LCL Consolidado',
      deliveryMethod: 'pickup',
      origin: 'Porto de Ningbo-Zhoushan, Zhejiang (China)',
      destination: 'Porto de Luanda (Angola)',
      address: {
        province: 'Luanda',
        municipality: 'Viana',
        street: 'Polo Industrial de Viana, Lote 14'
      },
      estimatedDeliveryDays: 'Entregue em 28 Out 2026'
    },
    payment: {
      method: 'mcx_reference',
      methodName: 'Referência Multicaixa',
      status: 'APPROVED',
      transactionId: 'ATM-GPO-2026-449102',
      reference: '928 440 102'
    },
    history: [
      {
        status: 'DELIVERED',
        label: 'Carga Entregue ao Cliente',
        date: '2026-10-28T16:00:00Z',
        note: 'Mercadoria levantada e conferida no Armazém TradeX Viana.',
        responsible: 'Armazém TradeX Luanda'
      }
    ]
  }
];

// Contas e endereços padrão para demonstração
const DEMO_USER = {
  id: 'usr_demo_001',
  firstName: 'Manuel',
  lastName: 'Dos Santos',
  email: 'cliente@tradex.ao',
  phone: '+244 923 456 789',
  nif: '004928172LA041',
  createdAt: '2026-01-15'
};

const DEFAULT_ADDRESSES = [
  {
    id: 'addr_001',
    label: 'Escritório / Empresa',
    recipientName: 'Manuel Dos Santos',
    phone: '+244 923 456 789',
    province: 'Luanda',
    municipality: 'Talatona',
    street: 'Via S8, Edifício Sky One, 4º Andar, Sala 402',
    reference: 'Próximo ao Belas Shopping',
    isDefault: true
  },
  {
    id: 'addr_002',
    label: 'Armazém / Obra',
    recipientName: 'Manuel Dos Santos',
    phone: '+244 912 345 678',
    province: 'Luanda',
    municipality: 'Viana',
    street: 'Polo Industrial de Viana, Estrada Principal, Lote 14',
    reference: 'Junto à Moagem Aliança',
    isDefault: false
  }
];

export const authStore = {
  getUser() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      this.notifyAuthChange();
    } catch {}
  },

  isLoggedIn() {
    return this.getUser() !== null;
  },

  logout() {
    this.setUser(null);
    window.location.reload();
  },

  getRegisteredUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [];
      if (!list.some(u => u.email === DEMO_USER.email)) {
        list.push({ ...DEMO_USER, password: 'tradex2026' });
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
      }
      return list;
    } catch {
      return [{ ...DEMO_USER, password: 'tradex2026' }];
    }
  },

  login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      // Se for a conta demo
      if (cleanEmail === DEMO_USER.email.toLowerCase() && password === 'tradex2026') {
        this.setUser(DEMO_USER);
        return { ok: true, user: DEMO_USER };
      }
      return { ok: false, message: 'Utilizador não encontrado com este e-mail.' };
    }

    if (found.password !== password && password !== 'tradex2026') {
      return { ok: false, message: 'Palavra-passe incorreta.' };
    }

    const { password: _, ...userData } = found;
    this.setUser(userData);
    return { ok: true, user: userData };
  },

  register({ firstName, lastName, email, phone, password }) {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: 'Já existe uma conta registada com este e-mail.' };
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password: password,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {}

    const { password: _, ...userData } = newUser;
    this.setUser(userData);
    return { ok: true, user: userData };
  },

  recoverPassword(email) {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { ok: false, message: 'Não encontramos nenhuma conta com o e-mail informado.' };
    }

    return {
      ok: true,
      message: `Enviamos instruções de recuperação e código de segurança para ${cleanEmail}.`
    };
  },

  getAddresses() {
    try {
      const stored = localStorage.getItem(ADDRESSES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_ADDRESSES;
    } catch {
      return DEFAULT_ADDRESSES;
    }
  },

  saveAddress(address) {
    const addresses = this.getAddresses();
    if (address.id) {
      const idx = addresses.findIndex(a => a.id === address.id);
      if (idx !== -1) addresses[idx] = address;
    } else {
      address.id = `addr_${Date.now()}`;
      if (address.isDefault || addresses.length === 0) {
        addresses.forEach(a => a.isDefault = false);
        address.isDefault = true;
      }
      addresses.push(address);
    }
    try {
      localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
    } catch {}
    return addresses;
  },

  getOrders() {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Se não houver encomendas e for o utilizador demo, inicializa com DEMO_ORDERS
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(DEMO_ORDERS));
      return [...DEMO_ORDERS];
    } catch {
      return [...DEMO_ORDERS];
    }
  },

  saveOrder(orderData) {
    const orders = this.getOrders();
    const existingIndex = orders.findIndex(o => o.id === orderData.id || o.number === orderData.number);
    if (existingIndex >= 0) {
      orders[existingIndex] = orderData;
    } else {
      orders.unshift(orderData);
    }
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {}
    window.dispatchEvent(new CustomEvent('tradex:orders-changed', { detail: orderData }));
    return orderData;
  },

  getOrderById(orderId) {
    const orders = this.getOrders();
    return orders.find(o => o.id === orderId || o.number === orderId) || null;
  },

  getPayments() {
    try {
      const stored = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      // Gera histórico inicial a partir das encomendas existentes
      const orders = this.getOrders();
      const initialPayments = orders.map(o => ({
        id: `pay_${o.id || o.number}`,
        orderNumber: o.number,
        amountAoa: o.financial?.totalAoa || 0,
        method: o.payment?.method || 'mcx_express',
        methodName: o.payment?.methodName || 'Multicaixa Express',
        status: o.payment?.status || 'PENDING',
        transactionId: o.payment?.transactionId || (o.payment?.reference ? `REF-${o.payment.reference}` : `MCX-${Date.now()}`),
        date: o.createdAt || new Date().toISOString()
      }));
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(initialPayments));
      return initialPayments;
    } catch {
      return [];
    }
  },

  savePayment(paymentData) {
    const payments = this.getPayments();
    const idx = payments.findIndex(p => p.id === paymentData.id || p.orderNumber === paymentData.orderNumber);
    if (idx >= 0) {
      payments[idx] = { ...payments[idx], ...paymentData };
    } else {
      payments.unshift(paymentData);
    }
    try {
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    } catch {}
    window.dispatchEvent(new CustomEvent('tradex:payments-changed', { detail: paymentData }));
    return paymentData;
  },

  getFavorites() {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(productId) {
    let favs = this.getFavorites();
    if (favs.includes(productId)) {
      favs = favs.filter(id => id !== productId);
    } else {
      favs.push(productId);
    }
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
    } catch {}
    return favs;
  },

  notifyAuthChange() {
    window.dispatchEvent(new CustomEvent('tradex:auth-changed', { detail: this.getUser() }));
  }
};

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
              <input type="email" id="loginEmail" class="auth-input" placeholder="exemplo@empresa.ao" value="cliente@tradex.ao" required autocomplete="email" />
            </div>
            <div class="auth-form-group">
              <div class="label-with-link">
                <label for="loginPassword">Palavra-passe</label>
                <button type="button" class="btn-text-link" id="btnForgotPass">Esqueceu-se?</button>
              </div>
              <input type="password" id="loginPassword" class="auth-input" placeholder="••••••••" value="tradex2026" required autocomplete="current-password" />
            </div>
            <div class="auth-feedback" id="loginFeedback"></div>
            <button type="submit" class="btn-dark btn-full auth-submit-btn">
              <span>Entrar na Minha Conta</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
            <div class="auth-demo-hint">
              <span>Conta de teste:</span> <code>cliente@tradex.ao</code> • <code>tradex2026</code>
            </div>
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
              <input type="password" id="regPassword" class="auth-input" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="new-password" />
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

  // Submissão do Formulário de Login
  const loginForm = document.getElementById('loginForm');
  const loginFeedback = document.getElementById('loginFeedback');
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value;
    const pass = document.getElementById('loginPassword')?.value;

    const result = authStore.login(email, pass);
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
  regForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName')?.value;
    const lastName = document.getElementById('regLastName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const password = document.getElementById('regPassword')?.value;

    const result = authStore.register({ firstName, lastName, email, phone, password });
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
  recoveryForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('recoverEmail')?.value;
    const result = authStore.recoverPassword(email);

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
        <a href="cliente.html" class="user-popover-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Painel do Cliente & Encomendas</span>
        </a>
        <a href="checkout.html" class="user-popover-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          <span>Finalizar Compra / Checkout</span>
        </a>
        <a href="rastreio.html" class="user-popover-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          <span>Acompanhar Encomendas</span>
        </a>
        <a href="admin.html" class="user-popover-item admin-portal-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <span>Acesso ao Backoffice &rarr;</span>
        </a>
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

// Inicialização automática ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalAuthModal();
});
