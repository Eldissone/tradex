// TradeX Global Trading - Backoffice (Fase 3)
// Utilizadores e conversão, fornecedores, lotes de envio, resumo financeiro,
// configurações e gráfico de vendas por categoria.
import { api } from './api.js';
import { authStore } from './auth.js';
import { cartStore } from './cart.js';

const fmt = (v) => cartStore.formatAoa(v || 0);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d, withTime = false) => d
  ? new Date(d).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) })
  : '—';
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const isAdmin = () => authStore.getUser()?.role === 'ADMIN';

function feedback(el, msg, kind = 'error') {
  if (!el) return;
  el.textContent = msg;
  el.className = `proof-upload-feedback ${kind}`;
}

function bindModal(overlayId, closeId) {
  const overlay = document.getElementById(overlayId);
  document.getElementById(closeId)?.addEventListener('click', () => overlay?.classList.remove('visible'));
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('visible'); });
  return {
    open: () => overlay?.classList.add('visible'),
    close: () => overlay?.classList.remove('visible')
  };
}

// =====================================================================
// Visão geral: vendas por categoria + clientes e conversão
// =====================================================================
async function renderCategoryChart() {
  const box = document.getElementById('adminCategoryChart');
  if (!box) return;
  const res = await api.admin.analytics();
  const rows = res.ok ? res.data.data.categoriesBreakdown : [];
  if (!rows.length) {
    box.innerHTML = '<p class="admin-empty-note">Sem vendas registadas.</p>';
    return;
  }
  const max = Math.max(...rows.map(r => r.revenueAoa), 1);
  box.innerHTML = rows.map(r => `
    <div class="chart-row">
      <span class="chart-label">${esc(r.category)}</span>
      <div class="chart-track"><div class="chart-track-fill" style="width:${Math.max(3, Math.round((r.revenueAoa / max) * 100))}%"></div></div>
      <span class="chart-val">${fmt(r.revenueAoa)}</span>
    </div>`).join('');
}

async function renderConversion() {
  const box = document.getElementById('adminConversionKpis');
  if (!box) return;
  const days = document.getElementById('conversionPeriod')?.value || 30;
  const res = await api.admin.customerAnalytics(days);
  if (!res.ok) {
    box.innerHTML = `<p class="admin-empty-note">${esc(res.message)}</p>`;
    return;
  }
  const d = res.data.data;
  const kpi = (title, value, hint) => `
    <div class="admin-mini-kpi">
      <span class="admin-mini-kpi-title">${title}</span>
      <strong class="admin-mini-kpi-value">${value}</strong>
      ${hint ? `<span class="admin-mini-kpi-hint">${hint}</span>` : ''}
    </div>`;
  box.innerHTML = [
    kpi('Clientes registados', d.registeredCustomers, `+${d.newCustomersInPeriod} no período`),
    kpi('Clientes que compraram', d.buyers, `${d.buyerRate}% dos registados`),
    kpi('Encomendas de convidados', d.guestOrders.count, `${d.guestOrders.share}% • ${fmt(d.guestOrders.valueAoa)}`),
    kpi('Encomendas com conta', d.accountOrders.count, `${d.accountOrders.share}% • ${fmt(d.accountOrders.valueAoa)}`),
    kpi('Convidados que criaram conta', d.guestsConvertedToAccount, ''),
    kpi('Carrinhos abandonados', d.abandonedCarts, `sem compra há mais de ${d.abandonedCartHours}h • ${d.activeCarts} activos`)
  ].join('');
}

// =====================================================================
// Utilizadores
// =====================================================================
const usersView = { segment: 'all', search: '' };
let usersTimer = null;

async function renderUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  const res = await api.admin.users({ segment: usersView.segment === 'all' ? '' : usersView.segment, search: usersView.search });
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty-message">${esc(res.message)}</td></tr>`;
    return;
  }
  const users = res.data.data;
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty-message">Nenhum utilizador encontrado.</td></tr>';
    return;
  }
  const me = authStore.getUser();
  const canEdit = isAdmin();
  const roleLabel = { ADMIN: 'Administrador', STAFF: 'Equipa', CUSTOMER: 'Cliente' };

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <strong>${esc(`${u.firstName} ${u.lastName}`.trim() || '—')}</strong>
        <span class="table-sub-detail">${esc(u.email)}${u.phone ? ` • ${esc(u.phone)}` : ''}</span>
        ${u.convertedFromGuest ? '<span class="table-sub-detail admin-tag-converted">Veio de compra como convidado</span>' : ''}
      </td>
      <td>
        ${canEdit && u.id !== me?.id ? `
          <select class="checkout-select admin-inline-select" data-user-role="${u.id}" aria-label="Papel de ${esc(u.email)}">
            ${Object.entries(roleLabel).map(([k, v]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${v}</option>`).join('')}
          </select>` : roleLabel[u.role]}
      </td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>${fmtDate(u.lastLoginAt, true)}</td>
      <td>${u.ordersCount}${u.cartItems ? `<span class="table-sub-detail">${u.cartItems} no carrinho</span>` : ''}</td>
      <td><strong class="pay-amount">${fmt(u.totalSpentAoa)}</strong></td>
      <td><span class="table-pay-badge ${u.active ? 'table-badge-approved' : 'table-badge-pending'}">${u.active ? 'Activo' : 'Desactivado'}</span></td>
      <td>
        ${canEdit && u.id !== me?.id ? `
          <button type="button" class="btn-outline-dark btn-xs" data-user-toggle="${u.id}" data-active="${u.active ? '1' : '0'}">
            ${u.active ? 'Desactivar' : 'Activar'}
          </button>` : '<span class="table-sub-detail">—</span>'}
      </td>
    </tr>`).join('');
}

function bindUsers() {
  document.querySelectorAll('#adminUserSegments .admin-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#adminUserSegments .admin-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      usersView.segment = pill.dataset.segment;
      renderUsers();
    });
  });
  document.getElementById('adminUserSearch')?.addEventListener('input', (e) => {
    usersView.search = e.target.value.trim();
    clearTimeout(usersTimer);
    usersTimer = setTimeout(renderUsers, 300);
  });

  const tbody = document.getElementById('adminUsersTableBody');
  tbody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-user-toggle]');
    if (!btn) return;
    const activate = btn.dataset.active !== '1';
    if (!activate && !confirm('Desactivar esta conta? A pessoa deixa de conseguir iniciar sessão.')) return;
    btn.disabled = true;
    const res = await api.admin.updateUser(btn.dataset.userToggle, { active: activate });
    if (!res.ok) alert(res.message);
    renderUsers();
  });
  tbody?.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-user-role]');
    if (!sel) return;
    if (!confirm(`Alterar o papel desta conta para "${sel.selectedOptions[0].text}"?`)) {
      renderUsers();
      return;
    }
    const res = await api.admin.updateUser(sel.dataset.userRole, { role: sel.value });
    if (!res.ok) alert(res.message);
    renderUsers();
  });
}

// =====================================================================
// Fornecedores
// =====================================================================
let suppliers = [];
export const supplierStore = { list: () => suppliers };

async function loadSuppliers() {
  const res = await api.admin.suppliers();
  if (res.ok) suppliers = res.data.data;
  renderSuppliers();
  window.dispatchEvent(new CustomEvent('tradex:suppliers-changed'));
}

function renderSuppliers() {
  const container = document.getElementById('adminSuppliersGrid');
  if (!container) return;
  if (!suppliers.length) {
    container.innerHTML = '<p class="table-empty-message">Sem fornecedores registados.</p>';
    return;
  }
  container.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Fornecedor</th><th>Categorias</th><th>Contacto</th><th>WeChat / WhatsApp</th><th>Termos</th><th>Produtos</th><th>Estado</th><th></th>
      </tr></thead>
      <tbody>${suppliers.map(sup => `
        <tr class="${sup.active ? '' : 'is-inactive'}">
          <td><strong>${esc(sup.name)}</strong><br><small>${esc(sup.province || '')}${sup.rating ? ' • ' + esc(sup.rating) : ''}</small></td>
          <td>${(sup.categories || []).map(c => `<span class="supplier-cat-tag">${esc(c)}</span>`).join(' ') || '—'}</td>
          <td>${esc(sup.contactPerson || '—')}<br>${sup.email ? `<a href="mailto:${esc(sup.email)}">${esc(sup.email)}</a>` : '—'}</td>
          <td>${esc(sup.wechat || '—')}<br>${esc(sup.whatsapp || '—')}</td>
          <td>${esc(sup.terms || '—')}</td>
          <td>${sup.productsCount ?? 0}</td>
          <td>${sup.active ? 'Activo' : 'Inactivo'}</td>
          <td><button type="button" class="btn-outline-dark btn-xs" data-supplier-edit="${sup.id}">Editar</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function bindSuppliers() {
  const modal = bindModal('supplierModalOverlay', 'btnCloseSupplierModal');
  const form = document.getElementById('formSupplier');
  const fb = document.getElementById('supplierFormFeedback');
  const f = (id) => document.getElementById(id);

  const fill = (sup) => {
    f('supplierFormId').value = sup?.id || '';
    f('supplierModalTitle').textContent = sup ? `Editar: ${sup.name}` : 'Novo Fornecedor';
    f('supplierFormName').value = sup?.name || '';
    f('supplierFormProvince').value = sup?.province || '';
    f('supplierFormRating').value = sup?.rating || '';
    f('supplierFormCategories').value = (sup?.categories || []).join(', ');
    f('supplierFormContact').value = sup?.contactPerson || '';
    f('supplierFormEmail').value = sup?.email || '';
    f('supplierFormWechat').value = sup?.wechat || '';
    f('supplierFormWhatsapp').value = sup?.whatsapp || '';
    f('supplierFormTerms').value = sup?.terms || '';
    f('supplierFormNotes').value = sup?.notes || '';
    f('supplierFormActive').checked = sup ? sup.active : true;
    feedback(fb, '');
    modal.open();
  };

  document.getElementById('btnOpenSupplierModal')?.addEventListener('click', () => fill(null));
  document.getElementById('adminSuppliersGrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-supplier-edit]');
    if (btn) fill(suppliers.find(s => s.id === btn.dataset.supplierEdit));
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = f('supplierFormId').value;
    const payload = {
      name: f('supplierFormName').value.trim(),
      province: f('supplierFormProvince').value.trim() || null,
      rating: f('supplierFormRating').value.trim() || null,
      categories: f('supplierFormCategories').value.split(',').map(c => c.trim()).filter(Boolean),
      contactPerson: f('supplierFormContact').value.trim() || null,
      email: f('supplierFormEmail').value.trim(),
      wechat: f('supplierFormWechat').value.trim() || null,
      whatsapp: f('supplierFormWhatsapp').value.trim() || null,
      terms: f('supplierFormTerms').value.trim() || null,
      notes: f('supplierFormNotes').value.trim() || null,
      active: f('supplierFormActive').checked
    };
    if (!payload.name) return feedback(fb, 'Indique o nome da empresa.');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const res = id ? await api.admin.updateSupplier(id, payload) : await api.admin.createSupplier(payload);
    btn.disabled = false;
    if (!res.ok) return feedback(fb, res.message);
    modal.close();
    loadSuppliers();
  });
}

// =====================================================================
// Lotes de envio
// =====================================================================
let shipments = [];
const SHIPMENT_FLOW = [
  ['DRAFT', 'Em preparação'],
  ['ORIGIN_WAREHOUSE', 'No armazém na China'],
  ['INTERNATIONAL_TRANSIT', 'Enviado'],
  ['ARRIVED', 'Chegou a Angola'],
  ['DISTRIBUTION', 'Em distribuição'],
  ['DELIVERED', 'Concluído']
];

async function loadShipments() {
  const res = await api.admin.shipments();
  if (res.ok) shipments = res.data.data;
  renderShipments();
}

// Encomendas pagas, ainda sem lote, que podem ser incluídas
function eligibleOrders() {
  return authStore.getOrders().filter(o =>
    !['AWAITING_PAYMENT', 'CANCELLED', 'RETURNED', 'DELIVERED'].includes(o.status) && !o.shipmentCode);
}

function renderShipments() {
  const container = document.getElementById('adminShipmentsGrid');
  if (!container) return;
  if (!shipments.length) {
    container.innerHTML = '<p class="table-empty-message">Sem lotes de envio. Crie o primeiro com "+ Novo Lote".</p>';
    return;
  }
  const linked = new Set(shipments.flatMap(s => s.ordersLinked));
  const candidates = eligibleOrders().filter(o => !linked.has(o.number));

  container.innerHTML = shipments.map(shp => `
    <div class="admin-shipment-card">
      <div class="shipment-head-row">
        <div>
          <span class="shipment-id-badge">${esc(shp.id)}</span>
          <h3 class="shipment-vessel-title">${esc(shp.title)} <small>(${esc(shp.mode)})</small></h3>
        </div>
        <span class="client-status-pill">${esc(shp.status)}</span>
      </div>
      <div class="shipment-route-bar">
        <span>Origem: <strong>${esc(shp.origin)}</strong></span><span>&rarr;</span><span>Destino: <strong>${esc(shp.destination)}</strong></span>
      </div>
      <div class="shipment-meta-grid">
        <div><span>Ref. Agente Parceiro:</span><strong>${esc(shp.agentReference || '—')}</strong></div>
        <div><span>Data de Envio:</span><strong>${esc(shp.etd)}</strong></div>
        <div><span>Previsão de Chegada:</span><strong>${esc(shp.eta)}</strong></div>
        <div><span>Carga Total:</span><strong>${esc(shp.volumeWeight)}</strong></div>
      </div>

      <div class="shipment-orders">
        <span class="shipment-orders-title">Encomendas no lote (${shp.ordersLinked.length})</span>
        <div class="shipment-order-chips">
          ${shp.ordersLinked.map(n => `<span class="shipment-order-chip">${esc(n)}<button type="button" aria-label="Retirar ${esc(n)}" data-unlink="${esc(shp.id)}" data-order="${esc(n)}">&times;</button></span>`).join('') || '<span class="table-sub-detail">Nenhuma encomenda associada.</span>'}
        </div>
        ${candidates.length ? `
          <div class="shipment-add-row">
            <select class="checkout-select admin-inline-select" data-link-select="${esc(shp.id)}" aria-label="Encomenda a adicionar">
              ${candidates.map(o => `<option value="${esc(o.number)}">${esc(o.number)} — ${esc(o.customer?.name || '')} (${esc(o.logistics?.shippingMode || '')})</option>`).join('')}
            </select>
            <button type="button" class="btn-outline-dark btn-xs" data-link="${esc(shp.id)}">Adicionar</button>
          </div>` : ''}
      </div>

      <div class="shipment-actions-row">
        <select class="checkout-select admin-inline-select" data-status-select="${esc(shp.id)}" aria-label="Estado do lote">
          ${SHIPMENT_FLOW.map(([k, v]) => `<option value="${k}" ${k === shp.statusKey ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <button type="button" class="btn-dark btn-xs" data-status-apply="${esc(shp.id)}">Actualizar estado</button>
        <button type="button" class="btn-outline-dark btn-xs" data-shipment-edit="${esc(shp.id)}">Editar</button>
      </div>
    </div>`).join('');
}

function bindShipments() {
  const modal = bindModal('shipmentModalOverlay', 'btnCloseShipmentModal');
  const form = document.getElementById('formShipment');
  const fb = document.getElementById('shipmentFormFeedback');
  const f = (id) => document.getElementById(id);

  const fill = (shp) => {
    f('shipmentFormCode').value = shp?.id || '';
    f('shipmentModalTitle').textContent = shp ? `Editar lote ${shp.id}` : 'Novo Lote de Envio';
    f('shipmentFormTitle').value = shp?.title || '';
    f('shipmentFormMode').value = shp?.transportMode || 'SEA';
    f('shipmentFormMode').disabled = Boolean(shp);
    f('shipmentFormRef').value = shp?.agentReference || '';
    f('shipmentFormOrigin').value = shp?.origin || 'Guangzhou (China)';
    f('shipmentFormVolume').value = shp && shp.volumeWeight !== '—' ? shp.volumeWeight : '';
    f('shipmentFormDeparted').value = toInputDate(shp?.departedAt);
    f('shipmentFormEta').value = toInputDate(shp?.etaAt);
    feedback(fb, '');
    modal.open();
  };

  document.getElementById('btnOpenShipmentModal')?.addEventListener('click', () => fill(null));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = f('shipmentFormCode').value;
    const payload = {
      title: f('shipmentFormTitle').value.trim(),
      transportMode: f('shipmentFormMode').value,
      agentReference: f('shipmentFormRef').value.trim() || null,
      origin: f('shipmentFormOrigin').value.trim() || 'Guangzhou (China)',
      volumeWeight: f('shipmentFormVolume').value.trim() || null,
      departedAt: f('shipmentFormDeparted').value || null,
      etaAt: f('shipmentFormEta').value || null
    };
    if (!payload.title) return feedback(fb, 'Indique o nome do lote.');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const res = code ? await api.admin.updateShipment(code, payload) : await api.admin.createShipment(payload);
    btn.disabled = false;
    if (!res.ok) return feedback(fb, res.message);
    modal.close();
    loadShipments();
  });

  document.getElementById('adminShipmentsGrid')?.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-shipment-edit]');
    if (edit) return fill(shipments.find(s => s.id === edit.dataset.shipmentEdit));

    const link = e.target.closest('[data-link]');
    if (link) {
      const sel = document.querySelector(`[data-link-select="${link.dataset.link}"]`);
      link.disabled = true;
      const res = await api.admin.linkShipmentOrders(link.dataset.link, [sel.value]);
      if (!res.ok) alert(res.message);
      else if (res.data.skipped) alert('A encomenda não foi incluída: só encomendas com pagamento confirmado podem entrar num lote.');
      return loadShipments();
    }

    const unlink = e.target.closest('[data-unlink]');
    if (unlink) {
      if (!confirm(`Retirar ${unlink.dataset.order} deste lote?`)) return;
      await api.admin.unlinkShipmentOrder(unlink.dataset.unlink, unlink.dataset.order);
      return loadShipments();
    }

    const apply = e.target.closest('[data-status-apply]');
    if (apply) {
      const code = apply.dataset.statusApply;
      const sel = document.querySelector(`[data-status-select="${code}"]`);
      const shp = shipments.find(s => s.id === code);
      const propagates = ['INTERNATIONAL_TRANSIT', 'ARRIVED'].includes(sel.value) && shp?.ordersLinked.length;
      if (propagates && !confirm(`Isto também actualiza ${shp.ordersLinked.length} encomenda(s) do lote para "${sel.selectedOptions[0].text}". Continuar?`)) return;
      apply.disabled = true;
      const res = await api.admin.shipmentStatus(code, sel.value);
      apply.disabled = false;
      if (!res.ok) return alert(res.message);
      await authStore.sync(); // encomendas actualizadas
      loadShipments();
    }
  });

  window.addEventListener('tradex:orders-changed', () => { if (authStore.isStaff()) renderShipments(); });
}

// =====================================================================
// Financeiro: resumo por período
// =====================================================================
async function renderFinanceSummary() {
  const grid = document.getElementById('financeSummaryGrid');
  if (!grid) return;
  const from = document.getElementById('financeFrom')?.value;
  const to = document.getElementById('financeTo')?.value;
  const res = await api.admin.financeSummary(from, to);
  if (!res.ok) {
    grid.innerHTML = `<p class="admin-empty-note">${esc(res.message)}</p>`;
    return;
  }
  const d = res.data.data;
  const card = (title, block, hint) => `
    <div class="admin-kpi-card">
      <span class="admin-kpi-title">${title}</span>
      <strong class="admin-kpi-value">${fmt(block.amountAoa)}</strong>
      <span class="admin-kpi-hint">${block.count} pagamento(s)${hint ? ` • ${hint}` : ''}</span>
    </div>`;
  grid.innerHTML = [
    card('Recebido (validado)', d.received),
    card('Comprovativos por validar', d.awaitingValidation),
    card('A aguardar transferência', d.awaitingTransfer),
    card('Rejeitados', d.declined)
  ].join('');
}

function bindFinance() {
  const from = document.getElementById('financeFrom');
  const to = document.getElementById('financeTo');
  if (from && !from.value) from.value = toInputDate(Date.now() - 30 * 86400000);
  if (to && !to.value) to.value = toInputDate(Date.now());
  from?.addEventListener('change', renderFinanceSummary);
  to?.addEventListener('change', renderFinanceSummary);
  window.addEventListener('tradex:payments-changed', () => { if (authStore.isStaff()) renderFinanceSummary(); });
}

// =====================================================================
// Configurações (prazos, frete, entrega, dados bancários)
// =====================================================================
let shippingSettings = null;

function bankRowHtml(acc = { bank: '', iban: '' }) {
  return `
    <div class="admin-bank-row">
      <input type="text" class="checkout-input" data-bank-name placeholder="Banco" value="${esc(acc.bank)}" aria-label="Banco" />
      <input type="text" class="checkout-input" data-bank-iban placeholder="IBAN" value="${esc(acc.iban)}" aria-label="IBAN" />
      <button type="button" class="btn-outline-dark btn-xs" data-bank-remove aria-label="Remover conta">&times;</button>
    </div>`;
}

async function renderSettings() {
  const [ship, bank] = await Promise.all([api.admin.getSetting('shipping'), api.admin.getSetting('bank')]);
  const readOnly = !isAdmin();

  if (ship.ok) {
    shippingSettings = ship.data.data;
    document.querySelectorAll('#formShippingSettings [data-mode]').forEach(input => {
      const v = shippingSettings.modes[input.dataset.mode]?.[input.dataset.field];
      input.value = input.dataset.field === 'freightRate' ? Math.round(v * 1000) / 10 : v;
    });
    document.querySelectorAll('#formShippingSettings [data-delivery]').forEach(input => {
      input.value = shippingSettings.deliveryMethods[input.dataset.delivery]?.feeAoa ?? 0;
    });
    const ins = document.getElementById('settingsInsuranceRate');
    if (ins) ins.value = Math.round(shippingSettings.cargoInsuranceRate * 1000) / 10;
  }
  if (bank.ok) {
    document.getElementById('settingsAccountHolder').value = bank.data.data.accountHolder || '';
    document.getElementById('settingsBankAccounts').innerHTML = (bank.data.data.accounts || []).map(bankRowHtml).join('');
  }

  document.querySelectorAll('#adminPanelSettings input, #adminPanelSettings button').forEach(el => { el.disabled = readOnly; });
  if (readOnly) {
    feedback(document.getElementById('shippingSettingsFeedback'), 'Apenas administradores podem alterar.', 'info');
  }
}

function bindSettings() {
  document.getElementById('formShippingSettings')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = document.getElementById('shippingSettingsFeedback');
    if (!shippingSettings) return;
    const next = structuredClone(shippingSettings);
    document.querySelectorAll('#formShippingSettings [data-mode]').forEach(input => {
      const raw = Number(input.value);
      next.modes[input.dataset.mode][input.dataset.field] = input.dataset.field === 'freightRate' ? raw / 100 : Math.round(raw);
    });
    document.querySelectorAll('#formShippingSettings [data-delivery]').forEach(input => {
      next.deliveryMethods[input.dataset.delivery].feeAoa = Math.round(Number(input.value) || 0);
    });
    next.cargoInsuranceRate = (Number(document.getElementById('settingsInsuranceRate').value) || 0) / 100;

    for (const [key, m] of Object.entries(next.modes)) {
      if (!(m.minDays > 0) || !(m.maxDays >= m.minDays)) {
        return feedback(fb, `Prazos inválidos em ${key === 'air_exp' ? 'Aéreo' : 'Marítimo'}: o máximo tem de ser maior ou igual ao mínimo.`);
      }
    }

    const res = await api.admin.saveSetting('shipping', next);
    if (!res.ok) return feedback(fb, res.message);
    shippingSettings = res.data.data;
    feedback(fb, 'Guardado. O checkout já usa os novos valores.', 'success');
  });

  const rows = document.getElementById('settingsBankAccounts');
  document.getElementById('btnAddBankAccount')?.addEventListener('click', () => rows.insertAdjacentHTML('beforeend', bankRowHtml()));
  rows?.addEventListener('click', (e) => {
    if (e.target.closest('[data-bank-remove]')) e.target.closest('.admin-bank-row').remove();
  });

  document.getElementById('formBankSettings')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = document.getElementById('bankSettingsFeedback');
    const accounts = [...rows.querySelectorAll('.admin-bank-row')]
      .map(r => ({ bank: r.querySelector('[data-bank-name]').value.trim(), iban: r.querySelector('[data-bank-iban]').value.trim() }))
      .filter(a => a.bank || a.iban);
    const res = await api.admin.saveSetting('bank', {
      accountHolder: document.getElementById('settingsAccountHolder').value.trim(),
      accounts
    });
    feedback(fb, res.ok ? 'Dados bancários guardados.' : res.message, res.ok ? 'success' : 'error');
  });
}

// =====================================================================
// Ciclo de vida
// =====================================================================
let bound = false;

export function initAdminExtras() {
  if (bound) return;
  bound = true;
  bindUsers();
  bindSuppliers();
  bindShipments();
  bindFinance();
  bindSettings();
  document.getElementById('conversionPeriod')?.addEventListener('change', renderConversion);
  document.getElementById('btnRefreshAnalytics')?.addEventListener('click', () => {
    renderCategoryChart();
    renderConversion();
  });
}

// Chamado depois do login de staff (e ao actualizar)
export function refreshAdminExtras() {
  if (!authStore.isStaff()) return;
  renderCategoryChart();
  renderConversion();
  renderUsers();
  loadSuppliers();
  loadShipments();
  renderFinanceSummary();
  renderSettings();
}
