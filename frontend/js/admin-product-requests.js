// TradeX Global Trading - Backoffice: pedidos de produto enviados por clientes (imagem + descrição)
import { api } from './api.js';
import { authStore } from './auth.js';
import { PRODUCTS_DATA } from './product-store.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (d) => new Date(d).toLocaleString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const safeImg = (u) => (/^(https?:\/\/|\/|data:image\/)/i.test(u || '') ? u : '');

const STATUS_LABEL = { NEW: 'Novo', IN_REVIEW: 'Em pesquisa', AVAILABLE: 'Disponibilizado', REJECTED: 'Rejeitado' };

const state = { filter: 'all', list: [], all: [], selected: null };

function $(id) { return document.getElementById(id); }

async function load() {
  if (!authStore.isStaff()) return;
  const res = await api.productRequests.list();
  if (!res.ok) return;
  state.all = res.data.data;
  render();
  updateBadge();
}

function updateBadge() {
  const badge = $('adminRequestsBadge');
  if (!badge) return;
  const n = state.all.filter(r => r.status === 'NEW').length;
  badge.textContent = n;
  badge.hidden = n === 0;
}

function render() {
  const body = $('adminRequestsBody');
  if (!body) return;
  state.list = state.filter === 'all' ? state.all : state.all.filter(r => r.status === state.filter);

  if (state.list.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="table-empty-message">Nenhum pedido${state.filter === 'all' ? '' : ' neste estado'}.</td></tr>`;
    return;
  }

  body.innerHTML = state.list.map(r => `
    <tr data-id="${esc(r.id)}">
      <td>${safeImg(r.imageUrl) ? `<img src="${esc(safeImg(r.imageUrl))}" alt="" class="admin-prod-thumb" loading="lazy" decoding="async" />` : '—'}</td>
      <td><strong>${esc(r.name)}</strong><br><small>${esc(r.phone)}${r.email ? ` · ${esc(r.email)}` : ''}</small></td>
      <td class="pr-desc-cell">${r.description ? esc(r.description.length > 90 ? r.description.slice(0, 90) + '…' : r.description) : '<small>Sem descrição</small>'}</td>
      <td><span class="pr-status pr-status-${esc(r.status)}">${esc(STATUS_LABEL[r.status] || r.status)}</span></td>
      <td>${esc(when(r.createdAt))}</td>
      <td><button type="button" class="btn-dark pr-open-btn" data-open="${esc(r.id)}">Abrir</button></td>
    </tr>`).join('');
}

function fillProducts(selectedId) {
  const sel = $('requestModalProduct');
  sel.innerHTML = '<option value="">— Nenhum —</option>' +
    PRODUCTS_DATA.map(p => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('');
  sel.value = selectedId || '';
}

function say(msg, type = 'error') {
  const fb = $('requestModalFeedback');
  fb.textContent = msg;
  fb.className = `auth-feedback visible ${type}`;
}

function openModal(id) {
  const r = state.all.find(x => x.id === id);
  if (!r) return;
  state.selected = r;
  $('requestModalMeta').textContent = `Recebido em ${when(r.createdAt)}`;
  const img = $('requestModalImg');
  img.src = safeImg(r.imageUrl);
  $('requestModalImgLink').href = safeImg(r.imageUrl) || '#';
  $('requestModalInfo').innerHTML = `
    <p><strong>${esc(r.name)}</strong></p>
    <p>Telefone/WhatsApp: <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a></p>
    ${r.email ? `<p>E-mail: <a href="mailto:${esc(r.email)}">${esc(r.email)}</a></p>` : ''}
    <p class="pr-admin-desc">${r.description ? esc(r.description) : '<em>Sem descrição.</em>'}</p>`;
  $('requestModalStatus').value = r.status;
  $('requestModalNote').value = r.adminNote || '';
  fillProducts(r.productId);
  $('requestModalFeedback').className = 'auth-feedback';
  $('requestModalOverlay').classList.add('visible');
}

function closeModal() {
  $('requestModalOverlay')?.classList.remove('visible');
  state.selected = null;
}

async function save() {
  const r = state.selected;
  if (!r) return;
  const btn = $('requestModalSave');
  btn.disabled = true;
  const res = await api.productRequests.update(r.id, {
    status: $('requestModalStatus').value,
    adminNote: $('requestModalNote').value.trim() || null,
    productId: $('requestModalProduct').value || null
  });
  btn.disabled = false;
  if (!res.ok) return say(res.message || 'Não foi possível guardar.');
  const i = state.all.findIndex(x => x.id === r.id);
  if (i >= 0) state.all[i] = res.data.data;
  render();
  updateBadge();
  closeModal();
}

async function remove() {
  const r = state.selected;
  if (!r) return;
  if (!confirm('Eliminar este pedido de produto? Esta ação não pode ser desfeita.')) return;
  const res = await api.productRequests.remove(r.id);
  if (!res.ok) return say(res.message || 'Não foi possível eliminar.');
  state.all = state.all.filter(x => x.id !== r.id);
  render();
  updateBadge();
  closeModal();
}

let bound = false;
export function initProductRequests() {
  if (bound) return;
  bound = true;

  $('adminRequestFilters')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.admin-filter-pill');
    if (!pill) return;
    $('adminRequestFilters').querySelectorAll('.admin-filter-pill').forEach(b => b.classList.toggle('active', b === pill));
    state.filter = pill.dataset.filter;
    render();
  });

  $('adminRequestsBody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    const row = e.target.closest('tr[data-id]');
    const id = btn?.dataset.open || row?.dataset.id;
    if (id) openModal(id);
  });

  $('btnRefreshRequests')?.addEventListener('click', load);
  $('requestModalClose')?.addEventListener('click', closeModal);
  $('requestModalSave')?.addEventListener('click', save);
  $('requestModalDelete')?.addEventListener('click', remove);
  $('requestModalOverlay')?.addEventListener('click', (e) => { if (e.target.id === 'requestModalOverlay') closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('requestModalOverlay')?.classList.contains('visible')) closeModal();
  });
}

export function refreshProductRequests() {
  load();
}
