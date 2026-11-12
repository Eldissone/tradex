// Escape de texto para HTML (conteúdo e atributos entre aspas). Usar em todo o dado
// vindo da API dentro de templates `innerHTML`.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
}

// URL segura para src/href: só http(s), caminhos relativos e /uploads. Caso contrário, valor de recurso.
export function safeUrl(value, fallback = '') {
  const v = String(value ?? '').trim();
  if (/^(https?:)?\/\//i.test(v) || /^\/(?!\/)/.test(v) || /^[\w][\w./-]*$/.test(v)) return esc(v);
  return esc(fallback);
}
