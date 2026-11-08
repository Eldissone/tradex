// TradeX Global Trading - Client API & Sincronização Backend
const API_CONFIG = {
  baseUrl: window.TRADEX_API_URL || 'http://localhost:3000/api/v1',
  timeoutMs: 5000
};

async function request(endpoint, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const res = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message, offline: true };
  }
}

export const api = {
  // Verificação de conectividade
  async health() {
    return request('/health');
  },

  // Autenticação
  auth: {
    async login(email, password) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },
    async register(userData) {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    async recoverPassword(email) {
      return request('/auth/recover-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    }
  },

  // Catálogo de Produtos
  products: {
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/products${q ? `?${q}` : ''}`);
    },
    async getById(id) {
      return request(`/products/${encodeURIComponent(id)}`);
    },
    async create(productData) {
      return request('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
    }
  },

  // Encomendas e Checkout
  orders: {
    async create(orderPayload) {
      return request('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });
    },
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/orders${q ? `?${q}` : ''}`);
    },
    async getByNumber(orderNumber) {
      return request(`/orders/${encodeURIComponent(orderNumber)}`);
    },
    async updateStatus(orderNumber, { status, note, responsible }) {
      return request(`/orders/${encodeURIComponent(orderNumber)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note, responsible })
      });
    }
  },

  // Pagamentos & Multicaixa
  payments: {
    async initiateMcx(payload) {
      return request('/payments/mcx-express', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async triggerWebhook(payload) {
      return request('/payments/webhook', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async history() {
      return request('/payments/history');
    }
  },

  // Rastreio Público de Cargas
  tracking: {
    async get(code) {
      return request(`/tracking/${encodeURIComponent(code)}`);
    }
  },

  // Backoffice Administrativo
  admin: {
    async getAnalytics() {
      return request('/admin/analytics');
    },
    async listSuppliers() {
      return request('/admin/suppliers');
    },
    async listShipments() {
      return request('/admin/shipments');
    },
    async sendNotification(payload) {
      return request('/admin/notifications/send', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  }
};
