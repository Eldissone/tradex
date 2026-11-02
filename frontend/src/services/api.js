const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const api = {
  health: async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      return response.ok ? response.json() : null;
    } catch {
      return null;
    }
  },
};

