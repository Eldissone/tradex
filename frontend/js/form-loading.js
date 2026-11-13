// Efeito de carregamento automático nos formulários.
// Ao submeter, o botão de envio mostra um spinner e o formulário fica protegido contra duplo envio
// até terminarem os pedidos à API iniciados por essa submissão. Se a validação falhar
// (nenhum pedido arranca), o estado é removido logo a seguir.
//
// Os pedidos são contados por netStart()/netEnd(), chamados em api.js.

let pending = 0;

export function netStart() { pending += 1; }
export function netEnd() { pending = Math.max(0, pending - 1); }

const NO_REQUEST_GRACE_MS = 300;   // tempo à espera que o handler inicie um pedido
const IDLE_AFTER_REQUEST_MS = 200; // pedidos encadeados (ex.: guardar e recarregar)
const MAX_MS = 90000;              // segurança: nunca fica preso

const active = new WeakMap();

function isDark(el) {
  const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
  if (!m) return false;
  const [r, g, b, a = 1] = m[1].split(',').map(Number);
  if (a < 0.4) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}

function setLoading(btn, on) {
  if (on) {
    btn.style.setProperty('--tx-spin', isDark(btn) ? '#ffffff' : '#111827');
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
  } else {
    btn.classList.remove('is-loading');
    btn.removeAttribute('aria-busy');
    btn.style.removeProperty('--tx-spin');
  }
}

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;

  // Já a processar: ignora o segundo envio
  if (active.has(form)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  const btn = e.submitter || form.querySelector('button[type="submit"], button:not([type])');
  if (!btn || btn.tagName !== 'BUTTON') return;

  const state = { started: Date.now(), sawRequest: false, idleSince: null };
  active.set(form, state);
  setLoading(btn, true);

  const timer = setInterval(() => {
    const now = Date.now();
    if (pending > 0) {
      state.sawRequest = true;
      state.idleSince = null;
    } else if (state.sawRequest) {
      state.idleSince ??= now;
    }
    const done =
      now - state.started > MAX_MS ||
      (state.sawRequest && state.idleSince && now - state.idleSince >= IDLE_AFTER_REQUEST_MS) ||
      (!state.sawRequest && now - state.started >= NO_REQUEST_GRACE_MS);
    if (done) {
      clearInterval(timer);
      active.delete(form);
      setLoading(btn, false);
    }
  }, 60);
}, true);
