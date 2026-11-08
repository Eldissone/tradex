// TradeX Global Trading - Dashboard do Cliente
import { authStore } from './auth.js';
import { cartStore } from './cart.js';
import { PRODUCTS_DATA } from './products-data.js';

document.addEventListener('DOMContentLoaded', () => {
  // Se o utilizador não estiver autenticado, autentica a conta demo por defeito
  if (!authStore.isLoggedIn()) {
    authStore.login('cliente@tradex.ao', 'tradex2026');
  }

  initClientDashboard();
});

function initClientDashboard() {
  const user = authStore.getUser();
  if (!user) return;

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
  if (elPhone) elPhone.textContent = user.phone || '+244 923 456 789';
  if (elNif) elNif.textContent = user.nif || '004928172LA041';
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
  const inTransit = orders.filter(o => o.status === 'IN_TRANSIT' || o.status === 'PROCESSING_SUPPLIER').length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;

  if (elTotal) elTotal.textContent = total;
  if (elPending) elPending.textContent = pending;
  if (elInTransit) elInTransit.textContent = inTransit;
  if (elDelivered) elDelivered.textContent = delivered;
}

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
        <a href="catalogo.html" class="btn-dark">Explorar Produtos no Catálogo &rarr;</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const isPending = order.payment?.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
    const isDelivered = order.status === 'DELIVERED';
    const isInTransit = order.status === 'IN_TRANSIT' || order.status === 'PROCESSING_SUPPLIER';

    let badgeClass = 'status-badge-pending';
    let badgeText = 'Aguardando Pagamento';

    if (isDelivered) {
      badgeClass = 'status-badge-delivered';
      badgeText = 'Entregue em Angola';
    } else if (isInTransit) {
      badgeClass = 'status-badge-transit';
      badgeText = order.status === 'PROCESSING_SUPPLIER' ? 'Em Preparação na China' : 'Em Trânsito Internacional';
    } else if (order.payment?.status === 'APPROVED') {
      badgeClass = 'status-badge-paid';
      badgeText = 'Pagamento Confirmado';
    }

    const itemsSummary = (order.items || []).slice(0, 3).map(item => `
      <div class="order-item-chip" title="${item.title}">
        <img src="${item.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100'}" alt="${item.title}" />
        <span>${item.quantity}x ${item.title.length > 25 ? item.title.slice(0, 25) + '...' : item.title}</span>
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
              <strong class="order-info-val">${order.logistics?.shippingMode || 'Marítimo LCL'}</strong>
            </div>
            <div class="order-info-col">
              <span class="order-info-label">Destino em Angola:</span>
              <strong class="order-info-val">${order.logistics?.address?.municipality || 'Luanda'}, ${order.logistics?.address?.province || 'Luanda'}</strong>
            </div>
            <div class="order-info-col">
              <span class="order-info-label">Total a Liquidar:</span>
              <strong class="order-info-val order-val-highlight">${cartStore.formatAoa(order.financial?.totalAoa || 0)}</strong>
            </div>
          </div>
        </div>

        <div class="order-card-actions">
          <a href="rastreio.html?codigo=${encodeURIComponent(order.number)}" class="btn-dark btn-sm">
            <span>Acompanhar Rastreio &rarr;</span>
          </a>
          <button type="button" class="btn-outline-dark btn-sm btn-view-order-details" data-order-number="${order.number}">
            <span>Ver Fatura / Detalhes</span>
          </button>
          ${isPending ? `
            <button type="button" class="btn-primary-action btn-sm btn-pay-now-action" data-order-number="${order.number}">
              <span>Pagar via Multicaixa</span>
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
    const badgeLabel = isApproved ? 'Liquidado' : 'Pendente';

    return `
      <tr>
        <td>
          <strong class="pay-tx-code">${pay.transactionId || pay.id}</strong>
        </td>
        <td>
          <a href="rastreio.html?codigo=${encodeURIComponent(pay.orderNumber)}" class="table-order-link">${pay.orderNumber}</a>
        </td>
        <td>${pay.methodName || 'Multicaixa Express'}</td>
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
        <strong class="address-title-tag">${addr.label || 'Morada de Descarga'}</strong>
        ${addr.isDefault ? '<span class="address-main-badge">Principal</span>' : ''}
      </div>
      <p class="address-recipient-line">${addr.recipientName} • ${addr.phone}</p>
      <p class="address-full-location">${addr.street}, ${addr.municipality}, ${addr.province}</p>
      ${addr.reference ? `<p class="address-ref-line">Ponto de Referência: ${addr.reference}</p>` : ''}
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
        <a href="catalogo.html" class="btn-dark">Explorar Produtos no Catálogo &rarr;</a>
      </div>
    `;
    return;
  }

  container.innerHTML = favoriteProducts.map(p => `
    <div class="client-fav-card">
      <div class="fav-card-image">
        <img src="${p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'}" alt="${p.title}" />
      </div>
      <div class="fav-card-content">
        <span class="fav-card-cat">${p.category.toUpperCase()}</span>
        <h4 class="fav-card-title">${p.title}</h4>
        <strong class="fav-card-price">${cartStore.formatAoa(p.priceAoa)}</strong>
        <div class="fav-card-actions">
          <a href="produto.html?id=${encodeURIComponent(p.id)}" class="btn-outline-dark btn-sm">Ver Detalhes</a>
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

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      ...user,
      firstName: inpFirst?.value.trim() || user.firstName,
      lastName: inpLast?.value.trim() || user.lastName,
      phone: inpPhone?.value.trim() || user.phone,
      nif: inpNif?.value.trim() || user.nif
    };

    if (inpPass && inpPass.value.trim().length >= 6) {
      updated.password = inpPass.value.trim();
    }

    authStore.setUser(updated);
    renderProfileHeader(updated);

    if (feedback) {
      feedback.textContent = 'Dados guardados com sucesso!';
      feedback.className = 'profile-feedback success visible';
      setTimeout(() => { feedback.className = 'profile-feedback'; }, 2500);
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

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = authStore.getUser();
    const newAddr = {
      id: `addr_${Date.now()}`,
      label: document.getElementById('mAddrLabel')?.value || 'Morada Adicional',
      recipientName: `${user.firstName} ${user.lastName}`,
      phone: user.phone || '+244 923 456 789',
      province: document.getElementById('mAddrProvince')?.value || 'Luanda',
      municipality: document.getElementById('mAddrMunicipality')?.value || '',
      street: document.getElementById('mAddrStreet')?.value || '',
      reference: document.getElementById('mAddrReference')?.value || '',
      isDefault: false
    };

    authStore.saveAddress(newAddr);
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

  const isPending = order.payment?.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';

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
        <span class="box-label">Despacho AGT & Seguro</span>
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
          <img src="${i.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100'}" alt="${i.title}" />
          <div class="modal-item-detail">
            <strong>${i.title}</strong>
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
        <strong>${order.payment?.methodName || 'Multicaixa Express'}</strong>
        <span class="modal-status-badge ${order.payment?.status === 'APPROVED' ? 'paid' : 'pending'}">
          ${order.payment?.status === 'APPROVED' ? 'PAGAMENTO APROVADO' : 'AGUARDANDO PAGAMENTO'}
        </span>
      </div>
      ${order.payment?.transactionId ? `<p class="modal-tx-code">Transação ID: <strong>${order.payment.transactionId}</strong></p>` : ''}
      ${order.payment?.reference ? `<p class="modal-tx-code">Entidade: <strong>00142</strong> &bull; Referência: <strong>${order.payment.reference}</strong></p>` : ''}
    </div>

    ${isPending ? `
      <!-- Ação Imediata de Pagamento se Pendente -->
      <div class="modal-pending-action-box">
        <p>Esta encomenda aguarda pagamento para iniciar a aquisição na China.</p>
        <button type="button" class="btn-dark btn-full" id="btnModalPayMcx">
          Simular Aprovação no Multicaixa Express (Webhook)
        </button>
      </div>
    ` : ''}

    <div class="modal-bottom-actions">
      <a href="rastreio.html?codigo=${encodeURIComponent(order.number)}" class="btn-dark">
        Acompanhar no Portal de Rastreio &rarr;
      </a>
      <button type="button" class="btn-outline-dark" id="btnModalPrintInvoice">
        Imprimir Fatura Pró-forma
      </button>
    </div>
  `;

  modal.classList.add('visible');

  document.getElementById('btnModalPayMcx')?.addEventListener('click', () => {
    order.payment.status = 'APPROVED';
    order.payment.transactionId = `MCX-TXN-${Date.now().toString().slice(-6)}`;
    order.status = 'PROCESSING_SUPPLIER';
    order.history.unshift({
      status: 'PAYMENT_CONFIRMED',
      label: 'Pagamento Confirmado em Kwanzas',
      date: new Date().toISOString(),
      note: 'Transação aprovada via Multicaixa Express.',
      responsible: 'Gateway Multicaixa'
    });

    authStore.saveOrder(order);
    authStore.savePayment({
      id: `pay_${Date.now()}`,
      orderNumber: order.number,
      amountAoa: order.financial?.totalAoa || 0,
      method: 'mcx_express',
      methodName: 'Multicaixa Express',
      status: 'APPROVED',
      transactionId: order.payment.transactionId,
      date: new Date().toISOString()
    });

    openOrderModal(order);
  });

  document.getElementById('btnModalPrintInvoice')?.addEventListener('click', () => {
    window.print();
  });
}

