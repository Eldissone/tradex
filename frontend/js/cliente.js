import { esc } from './esc.js';
// TradeX Global Trading - Dashboard do Cliente
import { authStore, openAuthModal } from './auth.js';
import { api } from './api.js';
import { renderProofUploader } from './proof-upload.js';
import { cartStore } from './cart.js';
import { PRODUCTS_DATA, loadProducts } from './product-store.js';

// A área do cliente exige sessão iniciada
document.addEventListener('DOMContentLoaded', () => {
  if (authStore.isLoggedIn()) {
    initClientDashboard();
  } else {
    showLoginRequired();
  }

  window.addEventListener('tradex:auth-changed', () => {
    if (authStore.isLoggedIn() && !dashboardStarted) {
      document.getElementById('clientLoginRequired')?.remove();
      initClientDashboard();
    } else if (!authStore.isLoggedIn() && dashboardStarted) {
      window.location.reload();
    }
  });
});

function showLoginRequired() {
  const main = document.querySelector('main') || document.body;
  main.querySelectorAll(':scope > *').forEach(el => { el.dataset.authHidden = '1'; el.style.display = 'none'; });
  const box = document.createElement('section');
  box.id = 'clientLoginRequired';
  box.className = 'client-login-required';
  box.innerHTML = `
    <h1>Área do Cliente</h1>
    <p>Inicie sessão para consultar as suas encomendas, pagamentos e moradas.</p>
    <div class="client-login-actions">
      <button type="button" class="btn-dark" data-auth="login">Iniciar Sessão</button>
      <button type="button" class="btn-outline-dark" data-auth="register">Criar Conta</button>
    </div>
    <p class="client-login-hint">Fez uma compra sem conta? Pode <a href="rastreio">acompanhar a encomenda pelo código</a>.</p>
  `;
  main.appendChild(box);
  box.querySelectorAll('[data-auth]').forEach(btn => {
    btn.addEventListener('click', () => openAuthModal(btn.getAttribute('data-auth')));
  });
  openAuthModal('login');
}

let dashboardStarted = false;

function initClientDashboard() {
  const user = authStore.getUser();
  if (!user) return;
  dashboardStarted = true;
  document.querySelectorAll('[data-auth-hidden]').forEach(el => { el.style.display = ''; delete el.dataset.authHidden; });

  renderProfileHeader(user);
  renderKpiMetrics();
  setupDashboardTabs();
  renderOrdersList();
  renderPaymentsTable();
  renderAddressesGrid();
  renderFavoritesGrid();
  setupProfileForm(user);
  setupAddressModal();
  setupOrderModal();

  // Ouve eventos de alteração de encomendas e pagamentos
  window.addEventListener('tradex:orders-changed', () => {
    renderKpiMetrics();
    renderOrdersList();
    renderPaymentsTable();
  });

  window.addEventListener('tradex:payments-changed', () => {
    renderKpiMetrics();
    renderPaymentsTable();
    renderOrdersList();
  });

  window.addEventListener('tradex:account-synced', () => {
    const fresh = authStore.getUser();
    if (fresh) renderProfileHeader(fresh);
    renderKpiMetrics();
    renderOrdersList();
    renderPaymentsTable();
    renderAddressesGrid();
    renderFavoritesGrid();
  });

  window.addEventListener('tradex:products-changed', renderFavoritesGrid);
  loadProducts();
}

// 1. Cabeçalho de Perfil
function renderProfileHeader(user) {
  const elAvatar = document.getElementById('clientAvatarLarge');
  const elName = document.getElementById('clientDisplayName');
  const elEmail = document.getElementById('clientDisplayEmail');
  const elPhone = document.getElementById('clientDisplayPhone');
  const elNif = document.getElementById('clientDisplayNif');

  const initials = `${user.firstName ? user.firstName.charAt(0) : 'U'}${user.lastName ? user.lastName.charAt(0) : ''}`;
  if (elAvatar) elAvatar.textContent = initials;
  if (elName) elName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Cliente TradeX';
  if (elEmail) elEmail.textContent = user.email || '';
  if (elPhone) elPhone.textContent = user.phone || '—';
  if (elNif) elNif.textContent = user.nif || '—';
}

// 2. Indicadores & KPIs
function renderKpiMetrics() {
  const orders = authStore.getOrders();
  const elTotal = document.getElementById('kpiTotalOrders');
  const elPending = document.getElementById('kpiPendingPayment');
  const elInTransit = document.getElementById('kpiInTransit');
  const elDelivered = document.getElementById('kpiDelivered');

  const total = orders.length;
  const pending = orders.filter(o => o.payment?.status === 'PENDING' || o.status === 'AWAITING_PAYMENT').length;
  const inTransit = orders.filter(o => IN_PROGRESS_STATUSES.includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;

  if (elTotal) elTotal.textContent = total;
  if (elPending) elPending.textContent = pending;
  if (elInTransit) elInTransit.textContent = inTransit;
  if (elDelivered) elDelivered.textContent = delivered;
}

const IN_PROGRESS_STATUSES = ['PROCESSING_SUPPLIER', 'IN_INTERNATIONAL_TRANSIT', 'ARRIVED_IN_ANGOLA', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];

// 3. Sistema de Abas do Painel
function setupDashboardTabs() {
  const tabBtns = document.querySelectorAll('.client-tab-btn');
  const tabPanels = document.querySelectorAll('.client-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const targetPanel = document.getElementById(`tabContent${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// 4. Lista de Encomendas
function renderOrdersList() {
  const container = document.getElementById('clientOrdersListContainer');
  if (!container) return;

  const orders = authStore.getOrders();
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="client-empty-box">
        <p>Ainda não possui nenhuma encomenda de importação registada.</p>
        <a href="catalogo" class="btn-dark">Explorar Produtos no Catálogo &rarr;</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const isPending = order.payment?.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
    const isDelivered = order.status === 'DELIVERED';
    const isInTransit = IN_PROGRESS_STATUSES.includes(order.status);
    const awaitingProof = order.payment?.status === 'PENDING' || order.payment?.status === 'DECLINED';

    let badgeClass = 'status-badge-pending';
    let badgeText = 'Aguardando Pagamento';

    if (isDelivered) {
      badgeClass = 'status-badge-delivered';
      badgeText = 'Entregue em Angola';
    } else if (isInTransit) {
      badgeClass = 'status-badge-transit';
      badgeText = order.statusLabel || 'Em Curso';
    } else if (order.payment?.status === 'REVIEW_PENDING') {
      badgeClass = 'status-badge-transit';
      badgeText = 'Comprovativo em Validação';
    } else if (order.payment?.status === 'APPROVED') {
      badgeClass = 'status-badge-paid';
      badgeText = 'Pagamento Confirmado';
    }

    const itemsSummary = (order.items || []).slice(0, 3).map(item => `
      <div class="order-item-chip" title="${esc(item.title)}">
        <img loading="lazy" decoding="async" src="${esc(item.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100')}" alt="${esc(item.title)}" />
        <span>${item.quantity}x ${esc(item.title.length > 25 ? item.title.slice(0, 25) + '...' : item.title)}</span>
      </div>
    `).join('');

    const moreCount = (order.items || []).length > 3 ? `+${order.items.length - 3} mais` : '';

    return `
      <div class="client-order-card" data-order-number="${order.number}">
        <div class="order-card-header">
          <div class="order-code-meta">
            <h3 class="order-number-title">${order.number}</h3>
            <span class="order-date-text">Emitida em ${new Date(order.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div class="order-status-wrap">
            <span class="client-order-badge ${badgeClass}">${badgeText}</span>
          </div>
        </div>

        <div class="order-card-body">
          <div class="order-items-preview">
            ${itemsSummary}
            ${moreCount ? `<span class="order-items-more">${moreCount}</span>` : ''}
          </div>

          <div class="order-meta-info-grid">
            <div class="order-info-col">
              <span class="order-info-label">Modalidade de Envio:</span>
              <strong class="order-info-val">${order.logistics?.shippingMode || 'Marítimo'}</strong>
            </div>
            <div class="order-info-col">
              <span class="order-info-label">Destino em Angola:</span>
              <strong class="order-info-val">${order.logistics?.deliveryMethod === 'pickup' ? 'Levantamento no Terminal TradeX' : esc(`${order.logistics?.address?.municipality || 'Luanda'}, ${order.logistics?.address?.province || 'Luanda'}`)}</strong>
            </div>
            <div class="order-info-col">
              <span class="order-info-label">Total a Liquidar:</span>
              <strong class="order-info-val order-val-highlight">${cartStore.formatAoa(order.financial?.totalAoa || 0)}</strong>
            </div>
          </div>
        </div>

        <div class="order-card-actions">
          <a href="rastreio?codigo=${encodeURIComponent(order.number)}" class="btn-dark btn-sm">
            <span>Acompanhar Rastreio &rarr;</span>
          </a>
          <button type="button" class="btn-outline-dark btn-sm btn-view-order-details" data-order-number="${order.number}">
            <span>Ver Fatura / Detalhes</span>
          </button>
          ${awaitingProof ? `
            <button type="button" class="btn-primary-action btn-sm btn-pay-now-action" data-order-number="${order.number}">
              <span>Pagar por Transferência</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Adiciona listeners para visualizar detalhes e pagar
  container.querySelectorAll('.btn-view-order-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.getAttribute('data-order-number');
      const order = authStore.getOrderById(num);
      if (order) openOrderModal(order);
    });
  });

  container.querySelectorAll('.btn-pay-now-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.getAttribute('data-order-number');
      const order = authStore.getOrderById(num);
      if (order) openOrderModal(order, true);
    });
  });
}

const PAYMENT_STATUS_LABELS = {
  PENDING: 'Aguarda Transferência',
  REVIEW_PENDING: 'Em Validação',
  APPROVED: 'Liquidado',
  DECLINED: 'Rejeitado',
  REFUNDED: 'Reembolsado'
};

// 5. Tabela de Pagamentos e Transações
function renderPaymentsTable() {
  const tbody = document.getElementById('clientPaymentsTableBody');
  if (!tbody) return;

  const payments = authStore.getPayments();
  if (payments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty-message">Nenhum registo de pagamento efetuado até ao momento.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = payments.map(pay => {
    const isApproved = pay.status === 'APPROVED';
    const badgeClass = isApproved ? 'table-badge-approved' : 'table-badge-pending';
    const badgeLabel = PAYMENT_STATUS_LABELS[pay.status] || 'Pendente';

    return `
      <tr>
        <td>
          <strong class="pay-tx-code">${esc(pay.reference || pay.transactionId || '—')}</strong>
        </td>
        <td>
          <a href="rastreio?codigo=${encodeURIComponent(pay.orderNumber)}" class="table-order-link">${pay.orderNumber}</a>
        </td>
        <td>${pay.methodName || 'Transferência Bancária'}</td>
        <td>${new Date(pay.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <strong class="pay-amount">${cartStore.formatAoa(pay.amountAoa)}</strong>
        </td>
        <td>
          <span class="table-pay-badge ${badgeClass}">${badgeLabel}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// 6. Grade de Endereços em Angola
function renderAddressesGrid() {
  const container = document.getElementById('clientAddressesGrid');
  if (!container) return;

  const addresses = authStore.getAddresses();
  if (addresses.length === 0) {
    container.innerHTML = `<p class="client-empty-text">Nenhum endereço guardado.</p>`;
    return;
  }

  container.innerHTML = addresses.map(addr => `
    <div class="client-address-card ${addr.isDefault ? 'default-address' : ''}">
      <div class="address-top-row">
        <strong class="address-title-tag">${esc(addr.label || 'Morada de Descarga')}</strong>
        ${addr.isDefault ? '<span class="address-main-badge">Principal</span>' : ''}
      </div>
      <p class="address-recipient-line">${esc(addr.recipientName)} • ${esc(addr.phone)}</p>
      <p class="address-full-location">${esc(addr.street)}, ${esc(addr.municipality)}, ${esc(addr.province)}</p>
      ${addr.reference ? `<p class="address-ref-line">Ponto de Referência: ${esc(addr.reference)}</p>` : ''}
    </div>
  `).join('');
}

// 7. Grade de Favoritos
function renderFavoritesGrid() {
  const container = document.getElementById('clientFavoritesGrid');
  if (!container) return;

  const favIds = authStore.getFavorites();
  const favoriteProducts = PRODUCTS_DATA.filter(p => favIds.includes(p.id));

  if (favoriteProducts.length === 0) {
    container.innerHTML = `
      <div class="client-empty-box">
        <p>Ainda não adicionou produtos aos seus favoritos.</p>
        <a href="catalogo" class="btn-dark">Explorar Produtos no Catálogo &rarr;</a>
      </div>
    `;
    return;
  }

  container.innerHTML = favoriteProducts.map(p => `
    <div class="client-fav-card">
      <div class="fav-card-image">
        <img loading="lazy" decoding="async" src="${esc(p.image || p.images?.[0]?.url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300')}" alt="${esc(p.title)}" />
      </div>
      <div class="fav-card-content">
        <span class="fav-card-cat">${(p.categoryLabel || p.category || '').toUpperCase()}</span>
        <h4 class="fav-card-title">${esc(p.title)}</h4>
        <strong class="fav-card-price">${cartStore.formatAoa(p.priceAoa)}</strong>
        <div class="fav-card-actions">
          <a href="produto?id=${encodeURIComponent(p.id)}" class="btn-outline-dark btn-sm">Ver Detalhes</a>
          <button type="button" class="btn-dark btn-sm btn-add-fav-cart" data-product-id="${p.id}">Adicionar</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-add-fav-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.getAttribute('data-product-id');
      const prod = PRODUCTS_DATA.find(p => p.id === prodId);
      if (prod) {
        cartStore.addItem(prod, 1);
        btn.textContent = 'Adicionado!';
        setTimeout(() => { btn.textContent = 'Adicionar'; }, 1500);
      }
    });
  });
}

// 8. Formulário de Perfil & Segurança
function setupProfileForm(user) {
  const form = document.getElementById('clientProfileForm');
  const inpFirst = document.getElementById('profFirstName');
  const inpLast = document.getElementById('profLastName');
  const inpEmail = document.getElementById('profEmail');
  const inpPhone = document.getElementById('profPhone');
  const inpNif = document.getElementById('profNif');
  const inpPass = document.getElementById('profNewPassword');
  const feedback = document.getElementById('profileFeedback');

  if (inpFirst) inpFirst.value = user.firstName || '';
  if (inpLast) inpLast.value = user.lastName || '';
  if (inpEmail) inpEmail.value = user.email || '';
  if (inpPhone) inpPhone.value = user.phone || '';
  if (inpNif) inpNif.value = user.nif || '';

  const inpCurrentPass = document.getElementById('profCurrentPassword');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: inpFirst?.value.trim(),
      lastName: inpLast?.value.trim(),
      phone: inpPhone?.value.trim(),
      nif: inpNif?.value.trim()
    };
    const newPass = inpPass?.value || '';
    if (newPass) {
      payload.newPassword = newPass;
      payload.currentPassword = inpCurrentPass?.value || '';
    }

    const result = await authStore.updateProfile(payload);
    if (feedback) {
      feedback.textContent = result.ok ? 'Dados guardados com sucesso!' : result.message;
      feedback.className = `profile-feedback ${result.ok ? 'success' : 'error'} visible`;
      setTimeout(() => { feedback.className = 'profile-feedback'; }, 3500);
    }
    if (result.ok) {
      renderProfileHeader(result.user);
      if (inpPass) inpPass.value = '';
      if (inpCurrentPass) inpCurrentPass.value = '';
    }
  });
}

// 9. Modal de Adicionar Novo Endereço
function setupAddressModal() {
  const modal = document.getElementById('newAddressModalOverlay');
  const btnOpen = document.getElementById('btnOpenNewAddressModal');
  const btnClose = document.getElementById('btnCloseAddressModal');
  const form = document.getElementById('modalNewAddressForm');

  btnOpen?.addEventListener('click', () => modal?.classList.add('visible'));
  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = authStore.getUser();
    const newAddr = {
      label: document.getElementById('mAddrLabel')?.value || 'Morada Adicional',
      recipientName: `${user.firstName} ${user.lastName}`,
      phone: user.phone || '',
      province: document.getElementById('mAddrProvince')?.value || 'Luanda',
      municipality: document.getElementById('mAddrMunicipality')?.value || '',
      street: document.getElementById('mAddrStreet')?.value || '',
      reference: document.getElementById('mAddrReference')?.value || '',
      isDefault: false
    };

    const result = await authStore.saveAddress(newAddr);
    if (!result.ok) {
      alert(result.message);
      return;
    }
    renderAddressesGrid();
    modal?.classList.remove('visible');
    form.reset();
  });
}

// 10. Modal de Detalhes da Encomenda & Fatura Pró-forma
function setupOrderModal() {
  const modal = document.getElementById('orderDetailModalOverlay');
  const btnClose = document.getElementById('btnCloseOrderModal');

  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });
}

function openOrderModal(order, autoTriggerPayment = false) {
  const modal = document.getElementById('orderDetailModalOverlay');
  const body = document.getElementById('modalOrderBody');
  const title = document.getElementById('modalOrderTitle');
  const subtitle = document.getElementById('modalOrderSubtitle');

  if (!modal || !body) return;

  if (title) title.textContent = `Encomenda ${order.number}`;
  if (subtitle) {
    subtitle.textContent = `Data: ${new Date(order.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })} • Destino: ${order.logistics?.destination || 'Luanda, Angola'}`;
  }

  const paymentStatus = order.payment?.status;
  const isPending = paymentStatus === 'PENDING' || paymentStatus === 'DECLINED';

  body.innerHTML = `
    <!-- Discriminativo Financeiro -->
    <div class="modal-order-summary-grid">
      <div class="modal-summary-box">
        <span class="box-label">Subtotal Produtos</span>
        <strong>${cartStore.formatAoa(order.financial?.subtotalAoa || 0)}</strong>
      </div>
      <div class="modal-summary-box">
        <span class="box-label">Frete (${order.logistics?.shippingMode?.includes('Aéreo') ? 'Aéreo' : 'Marítimo'})</span>
        <strong>${cartStore.formatAoa(order.financial?.internationalFreightAoa || 0)}</strong>
      </div>
      <div class="modal-summary-box">
        <span class="box-label">Seguro de Carga</span>
        <strong>${cartStore.formatAoa(order.financial?.customsInsuranceAoa || 0)}</strong>
      </div>
      <div class="modal-summary-box highlight">
        <span class="box-label">Total Liquidado em Kwanzas</span>
        <strong class="total-big">${cartStore.formatAoa(order.financial?.totalAoa || 0)}</strong>
      </div>
    </div>

    <!-- Lista de Itens -->
    <h4 class="modal-subheading">Produtos da Encomenda</h4>
    <div class="modal-order-items">
      ${(order.items || []).map(i => `
        <div class="modal-item-row">
          <img loading="lazy" decoding="async" src="${esc(i.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100')}" alt="${esc(i.title)}" />
          <div class="modal-item-detail">
            <strong>${esc(i.title)}</strong>
            <span>${i.quantity} un. x ${cartStore.formatAoa(i.priceAoa)}</span>
          </div>
          <strong class="modal-item-total">${cartStore.formatAoa(i.subtotal || i.priceAoa * i.quantity)}</strong>
        </div>
      `).join('')}
    </div>

    <!-- Seção de Pagamento -->
    <h4 class="modal-subheading">Método de Liquidação</h4>
    <div class="modal-payment-card">
      <div class="modal-pm-head">
        <strong>${order.payment?.methodName || 'Transferência Bancária'}</strong>
        <span class="modal-status-badge ${paymentStatus === 'APPROVED' ? 'paid' : 'pending'}">
          ${(PAYMENT_STATUS_LABELS[paymentStatus] || 'Aguarda Transferência').toUpperCase()}
        </span>
      </div>
      ${order.payment?.reference ? `<p class="modal-tx-code">Referência: <strong>${esc(order.payment.reference)}</strong></p>` : ''}
    </div>

    ${isPending ? `
      <!-- Ação Imediata de Pagamento se Pendente -->
      <div class="modal-pending-action-box">
        <p>Esta encomenda aguarda pagamento para iniciar a compra na China. Transfira ${cartStore.formatAoa(order.financial?.totalAoa || 0)} indicando <strong>${order.number}</strong> no descritivo e depois confirme abaixo.</p>
        <div id="modalBankAccounts" class="modal-bank-accounts"></div>
        <div id="modalProofUploader"></div>
      </div>
    ` : ''}

    <div class="modal-bottom-actions">
      <a href="rastreio?codigo=${encodeURIComponent(order.number)}" class="btn-dark">
        Acompanhar no Portal de Rastreio &rarr;
      </a>
      <button type="button" class="btn-outline-dark" id="btnModalPrintInvoice">
        Imprimir Fatura Pró-forma
      </button>
    </div>
  `;

  modal.classList.add('visible');

  if (isPending) {
    api.config.payments().then(res => {
      const box = document.getElementById('modalBankAccounts');
      const accounts = res.ok ? res.data.data.bank?.accounts || [] : [];
      if (box) box.innerHTML = accounts.map(a => `<p><strong>${esc(a.bank)}:</strong> ${esc(a.iban)}</p>`).join('');
    });
  }

  if (isPending) {
    renderProofUploader(document.getElementById('modalProofUploader'), {
      orderNumber: order.number,
      rejectionReason: paymentStatus === 'DECLINED' ? order.payment?.rejectionReason : null,
      onSuccess: (updated) => {
        authStore.cacheOrder(updated);
        authStore.refreshPayments();
        setTimeout(() => openOrderModal(updated), 900);
      }
    });
  }

  document.getElementById('btnModalPrintInvoice')?.addEventListener('click', () => {
    window.print();
  });
}

