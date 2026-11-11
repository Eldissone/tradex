// TradeX Global Trading - Cliente da API
const API_CONFIG = {
  baseUrl: import.meta.env?.VITE_API_URL || window.TRADEX_API_URL || 'http://localhost:3000/api/v1',
  timeoutMs: 10000
};

const TOKEN_STORAGE_KEY = 'tradex_auth_token_v1';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_STORAGE_KEY); } catch { return null; }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  }
};

async function request(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || API_CONFIG.timeoutMs);

  try {
    const token = tokenStore.get();
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const { timeoutMs, ...fetchOptions } = options;
    const res = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
      body: options.body && !isForm && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
      signal: controller.signal
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('tradex:session-expired'));
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      message: data?.message || (res.ok ? '' : 'Ocorreu um erro. Tente novamente.')
    };
  } catch (err) {
    return {
      ok: false,
      offline: true,
      error: err.message,
      message: 'Não foi possível contactar o servidor TradeX. Verifique a ligação e tente novamente.'
    };
  } finally {
    clearTimeout(timeout);
  }
}

const qs = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  return q ? `?${q}` : '';
};

export const api = {
  health: () => request('/health'),

  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    me: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/me', { method: 'PATCH', body: data }),
    recoverPassword: (email) => request('/auth/recover-password', { method: 'POST', body: { email } }),
    resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } })
  },

  me: {
    addresses: () => request('/me/addresses'),
    addAddress: (address) => request('/me/addresses', { method: 'POST', body: address }),
    deleteAddress: (id) => request(`/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    favorites: () => request('/me/favorites'),
    cart: () => request('/me/cart'),
    saveCart: (items) => request('/me/cart', { method: 'PUT', body: { items } }),
    toggleFavorite: (productId) => request(`/me/favorites/${encodeURIComponent(productId)}/toggle`, { method: 'POST' })
  },

  config: {
    shipping: () => request('/config/shipping'),
    payments: () => request('/payments/config'),
    cms: () => request('/config/cms')
  },

  products: {
    list: (params) => request(`/products${qs(params)}`),
    categories: () => request('/products/categories'),
    getById: (id) => request(`/products/${encodeURIComponent(id)}`),
    create: (data) => request('/products', { method: 'POST', body: data }),
    update: (id, data) => request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    deactivate: (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    remove: (id) => request(`/products/${encodeURIComponent(id)}?permanent=1`, { method: 'DELETE' })
  },

  orders: {
    create: (payload) => request('/orders', { method: 'POST', body: payload }),
    list: (params) => request(`/orders${qs(params)}`),
    getByNumber: (number) => request(`/orders/${encodeURIComponent(number)}`),
    updateStatus: (number, { status, note, responsible, notify = true }) =>
      request(`/orders/${encodeURIComponent(number)}/status`, { method: 'PATCH', body: { status, note, responsible, notify } })
  },

  payments: {
    list: () => request('/payments'),
    uploadProof: (orderNumber, file, { email, reference } = {}) => {
      const form = new FormData();
      form.append('file', file);
      if (email) form.append('email', email);
      if (reference) form.append('reference', reference);
      return request(`/payments/${encodeURIComponent(orderNumber)}/proof`, { method: 'POST', body: form, timeoutMs: 60000 });
    },
    // Ficheiro do comprovativo (staff), devolvido como Blob
    async proofBlob(paymentId) {
      const token = tokenStore.get();
      try {
        const res = await fetch(`${API_CONFIG.baseUrl}/payments/${encodeURIComponent(paymentId)}/proof`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          let message = 'Não foi possível abrir o comprovativo.';
          try { message = (await res.json()).message || message; } catch {}
          return { ok: false, message };
        }
        return { ok: true, blob: await res.blob() };
      } catch {
        return { ok: false, message: 'Não foi possível contactar o servidor TradeX.' };
      }
    },
    review: (paymentId, approved, note) =>
      request(`/payments/${encodeURIComponent(paymentId)}/review`, { method: 'POST', body: { approved, note } })
  },

  tracking: {
    lookup: (code, email) => request('/tracking/lookup', { method: 'POST', body: { code, email: email || undefined } })
  },

  admin: {
    analytics: () => request('/admin/analytics'),
    suppliers: () => request('/admin/suppliers'),
    createSupplier: (data) => request('/admin/suppliers', { method: 'POST', body: data }),
    updateSupplier: (id, data) => request(`/admin/suppliers/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    shipments: () => request('/admin/shipments'),
    sendNotification: (payload) => request('/admin/notifications/send', { method: 'POST', body: payload }),
    notifications: (limit) => request(`/admin/notifications${qs({ limit })}`),
    integrations: () => request('/admin/integrations'),
    conversations: (status) => request(`/admin/conversations${qs({ status })}`),
    conversation: (id) => request(`/admin/conversations/${encodeURIComponent(id)}`),
    replyConversation: (id, text) => request(`/admin/conversations/${encodeURIComponent(id)}/reply`, { method: 'POST', body: { text } }),
    setConversationStatus: (id, status) => request(`/admin/conversations/${encodeURIComponent(id)}/status`, { method: 'POST', body: { status } }),
    users: (params) => request(`/admin/users${qs(params)}`),
    updateUser: (id, data) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
    customerAnalytics: (days) => request(`/admin/analytics/customers${qs({ days })}`),
    financeSummary: (from, to) => request(`/admin/finance/summary${qs({ from, to })}`),
    createShipment: (data) => request('/admin/shipments', { method: 'POST', body: data }),
    updateShipment: (code, data) => request(`/admin/shipments/${encodeURIComponent(code)}`, { method: 'PUT', body: data }),
    linkShipmentOrders: (code, orderNumbers) => request(`/admin/shipments/${encodeURIComponent(code)}/orders`, { method: 'POST', body: { orderNumbers } }),
    unlinkShipmentOrder: (code, number) => request(`/admin/shipments/${encodeURIComponent(code)}/orders/${encodeURIComponent(number)}`, { method: 'DELETE' }),
    shipmentStatus: (code, status, note) => request(`/admin/shipments/${encodeURIComponent(code)}/status`, { method: 'POST', body: { status, note } }),
    uploadImage: (file) => {
      const form = new FormData();
      form.append('file', file);
      return request('/admin/uploads', { method: 'POST', body: form, timeoutMs: 60000 });
    },
    getSetting: (key) => request(`/admin/settings/${key}`),
    saveSetting: (key, value) => request(`/admin/settings/${key}`, { method: 'PUT', body: value })
  }
};
