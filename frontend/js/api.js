// TradeX Global Trading - Pure Vanilla API Client

const API_CONFIG = {
  baseUrl: window.TRADEX_API_URL || 'http://localhost:3000/api/v1',
  timeoutMs: 6000
};

export const api = {
  async health() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
      
      const res = await fetch(`${API_CONFIG.baseUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async trackOrder(orderCode) {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/orders/${encodeURIComponent(orderCode)}/track`);
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
};

