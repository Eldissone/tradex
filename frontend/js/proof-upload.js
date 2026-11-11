// TradeX Global Trading - Envio do comprovativo de transferência
// Usado no checkout, na área do cliente e no rastreio (convidados).
import { api } from './api.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];
let counter = 0;

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {string} opts.orderNumber
 * @param {string} [opts.email]        e-mail do convidado (quando já conhecido)
 * @param {boolean} [opts.askEmail]    pede o e-mail da compra (rastreio sem sessão)
 * @param {string} [opts.rejectionReason]
 * @param {boolean} [opts.replacing]   já existe um comprovativo em validação
 * @param {(order: object) => void} [opts.onSuccess]
 */
export function renderProofUploader(container, opts) {
  if (!container) return;
  const id = `proof${++counter}`;

  container.innerHTML = `
    <form class="proof-upload-form" id="${id}Form" novalidate>
      ${opts.rejectionReason ? `
        <p class="proof-upload-rejected">
          <strong>Comprovativo anterior rejeitado:</strong> ${escapeHtml(opts.rejectionReason)}
        </p>` : ''}
      ${opts.askEmail ? `
        <label class="proof-upload-label" for="${id}Email">E-mail usado na compra *</label>
        <input type="email" id="${id}Email" class="checkout-input" required autocomplete="email" placeholder="exemplo@empresa.ao" />
      ` : ''}
      <label class="proof-upload-label" for="${id}File">
        ${opts.replacing ? 'Substituir comprovativo' : 'Comprovativo de transferência'} * <span class="proof-upload-hint">(PDF, JPG ou PNG, até 5 MB)</span>
      </label>
      <input type="file" id="${id}File" class="proof-upload-file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required />
      <label class="proof-upload-label" for="${id}Ref">Referência da transferência <span class="proof-upload-hint">(opcional)</span></label>
      <input type="text" id="${id}Ref" class="checkout-input" maxlength="120" placeholder="Ex.: nº da operação no extracto" />
      <button type="submit" class="btn-dark btn-full proof-upload-submit">Enviar comprovativo</button>
      <p class="proof-upload-feedback" id="${id}Feedback" role="status" aria-live="polite"></p>
    </form>
  `;

  const form = container.querySelector(`#${id}Form`);
  const fileInput = container.querySelector(`#${id}File`);
  const feedback = container.querySelector(`#${id}Feedback`);
  const submit = form.querySelector('.proof-upload-submit');

  const show = (msg, kind = 'error') => {
    feedback.textContent = msg;
    feedback.className = `proof-upload-feedback ${kind}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files?.[0];
    const email = opts.askEmail ? container.querySelector(`#${id}Email`).value.trim() : opts.email;
    const reference = container.querySelector(`#${id}Ref`).value.trim();

    if (opts.askEmail && !email) return show('Indique o e-mail usado na compra.');
    if (!file) return show('Escolha o ficheiro do comprovativo.');
    if (file.size > MAX_BYTES) return show('O ficheiro excede o limite de 5 MB.');
    if (file.type && !ACCEPTED.includes(file.type)) return show('Formato não suportado. Envie um PDF, JPG ou PNG.');

    submit.disabled = true;
    show('A enviar…', 'info');
    const res = await api.payments.uploadProof(opts.orderNumber, file, { email, reference });
    submit.disabled = false;

    if (!res.ok) return show(res.message || 'Não foi possível enviar o comprovativo.');
    show('Comprovativo recebido. A tesouraria vai validar o pagamento.', 'success');
    opts.onSuccess?.(res.data.data);
  });
}
