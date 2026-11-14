// Modal "Efetuar Pedido": o cliente envia a imagem do produto que procura (e uma descrição
// opcional). O pedido chega ao backoffice, onde a equipa pesquisa e disponibiliza o produto.
import { api } from './api.js';
import { authStore } from './auth.js';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

let overlay = null;
let previewUrl = null;

function currentUserDefaults() {
  const u = authStore.getUser?.() || null;
  if (!u) return { name: '', phone: '', email: '' };
  return {
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '',
    phone: u.phone || u.customer?.phone || '',
    email: u.email || ''
  };
}

function build() {
  const el = document.createElement('div');
  el.className = 'auth-modal-overlay';
  el.id = 'productRequestOverlay';
  el.innerHTML = `
    <div class="auth-modal-card pr-modal-card" role="dialog" aria-modal="true" aria-labelledby="prTitle">
      <div class="auth-modal-header">
        <div>
          <h2 class="auth-modal-title" id="prTitle">Efetuar pedido de produto</h2>
          <p class="auth-modal-subtitle">Envie uma imagem do produto que procura. A nossa equipa pesquisa-o e disponibiliza-o no sistema.</p>
        </div>
        <button type="button" class="auth-modal-close" id="prClose" aria-label="Fechar">✕</button>
      </div>
      <form class="auth-form pr-form" id="productRequestForm" novalidate>
        <div class="auth-form-group">
          <label for="prImage">Imagem do produto *</label>
          <input type="file" id="prImage" accept="image/jpeg,image/png,image/webp" hidden />
          <button type="button" class="pr-dropzone" id="prDrop">
            <img id="prPreview" class="pr-preview" alt="Pré-visualização do produto" hidden />
            <span class="pr-drop-text" id="prDropText">
              <strong>Escolher imagem</strong>
              <small>JPG, PNG ou WEBP · até 4 MB</small>
            </span>
            <span class="pr-change" id="prChange" hidden>Tocar para trocar a imagem</span>
          </button>
        </div>
        <div class="auth-form-group">
          <label for="prDescription">Descrição <span class="pr-optional">(opcional)</span></label>
          <textarea id="prDescription" class="auth-input" rows="3" maxlength="1500" placeholder="Modelo, quantidade, medidas, link do fornecedor..."></textarea>
        </div>
        <div class="auth-form-group">
          <label for="prName">Nome / Empresa *</label>
          <input type="text" id="prName" class="auth-input" maxlength="120" autocomplete="name" required />
        </div>
        <div class="pr-row">
          <div class="auth-form-group">
            <label for="prPhone">Telefone / WhatsApp *</label>
            <input type="tel" id="prPhone" class="auth-input" maxlength="40" autocomplete="tel" placeholder="+244 9..." required />
          </div>
          <div class="auth-form-group">
            <label for="prEmail">E-mail <span class="pr-optional">(opcional)</span></label>
            <input type="email" id="prEmail" class="auth-input" maxlength="160" autocomplete="email" />
          </div>
        </div>
        <div class="auth-feedback" id="prFeedback" role="alert"></div>
        <button type="submit" class="auth-submit-btn" id="prSubmit">Enviar pedido</button>
      </form>
    </div>`;
  document.body.appendChild(el);

  const form = el.querySelector('#productRequestForm');
  const fileInput = el.querySelector('#prImage');
  const drop = el.querySelector('#prDrop');
  const preview = el.querySelector('#prPreview');
  const dropText = el.querySelector('#prDropText');
  const change = el.querySelector('#prChange');
  const feedback = el.querySelector('#prFeedback');
  let file = null;

  const say = (msg, type = 'error') => {
    feedback.textContent = msg;
    feedback.className = `auth-feedback visible ${type}`;
  };

  const setFile = (f) => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    file = f;
    drop.classList.toggle('has-file', Boolean(f));
    change.hidden = !f;
    if (!f) { preview.hidden = true; dropText.hidden = false; return; }
    previewUrl = URL.createObjectURL(f);
    preview.src = previewUrl;
    preview.hidden = false;
    dropText.hidden = true;
  };

  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { fileInput.value = ''; setFile(null); return say('Formato não suportado. Use JPG, PNG ou WEBP.'); }
    if (f.size > MAX_BYTES) { fileInput.value = ''; setFile(null); return say('A imagem excede 4 MB. Escolha uma mais leve.'); }
    feedback.className = 'auth-feedback';
    setFile(f);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = el.querySelector('#prName').value.trim();
    const phone = el.querySelector('#prPhone').value.trim();
    if (!file) return say('Anexe uma imagem do produto que procura.');
    if (name.length < 2) return say('Indique o seu nome.');
    if (phone.length < 6) return say('Indique um telefone ou WhatsApp para contacto.');

    const body = new FormData();
    body.append('image', file);
    body.append('name', name);
    body.append('phone', phone);
    body.append('email', el.querySelector('#prEmail').value.trim());
    body.append('description', el.querySelector('#prDescription').value.trim());

    const submit = el.querySelector('#prSubmit');
    submit.disabled = true;
    const res = await api.productRequests.create(body);
    submit.disabled = false;
    if (!res.ok) return say(res.message || 'Não foi possível enviar o pedido.');

    form.innerHTML = `
      <div class="pr-success">
        <div class="pr-success-icon" aria-hidden="true">✓</div>
        <h3>Pedido enviado!</h3>
        <p>Recebemos a sua imagem. A nossa equipa vai pesquisar o produto e entrará em contacto através do contacto indicado.</p>
        <button type="button" class="auth-submit-btn" id="prDone">Fechar</button>
      </div>`;
    form.querySelector('#prDone').addEventListener('click', close);
  });

  el.querySelector('#prClose').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('visible')) close();
  });
  return el;
}

function close() {
  overlay?.classList.remove('visible');
  document.body.classList.remove('pr-modal-open');
  // Recria o modal na próxima abertura (formulário limpo)
  const old = overlay;
  overlay = null;
  setTimeout(() => old?.remove(), 350);
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
}

export function openProductRequestModal() {
  if (overlay) return;
  overlay = build();
  const d = currentUserDefaults();
  overlay.querySelector('#prName').value = d.name;
  overlay.querySelector('#prPhone').value = d.phone;
  overlay.querySelector('#prEmail').value = d.email;
  document.body.classList.add('pr-modal-open');
  requestAnimationFrame(() => overlay?.classList.add('visible'));
}

