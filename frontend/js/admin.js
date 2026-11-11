// TradeX Global Trading - Dashboard Administrativo Backoffice
import { authStore } from './auth.js';
import { cartStore } from './cart.js';
import { PRODUCTS_DATA, loadProducts } from './product-store.js';
import { api } from './api.js';
import { cmsStore, loadCms } from './cms.js';
import { initAdminExtras, refreshAdminExtras, supplierStore } from './admin-extra.js';
import { initConversations, refreshConversations, refreshNotificationLogs, fillNotificationOrders } from './admin-conversations.js';

// Dados carregados da API (backoffice)

const ORDER_STATUS_LABELS = {
  AWAITING_PAYMENT: 'Aguardando Pagamento',
  PAYMENT_CONFIRMED: 'Pagamento Confirmado',
  PROCESSING_SUPPLIER: 'Em Processamento (China)',
  IN_INTERNATIONAL_TRANSIT: 'Enviado',
  ARRIVED_IN_ANGOLA: 'Chegou a Angola',
  READY_FOR_PICKUP: 'Pronto p/ Levantamento',
  OUT_FOR_DELIVERY: 'Em Entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
  RETURNED: 'Devolvida'
};

// Registo Inicial de Notificações Multicanal

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

function initAdminDashboard() {
  checkAdminAuth();
  setupAdminNavigation();
  bindOrdersModule();
  initAdminExtras();
  initConversations();
  setupOrderStatusModal();
  setupProductModal();
  renderAnalyticsModule();
  renderOrdersModule();
  renderProductsModule();
  renderSuppliersModule();
  renderLogisticsModule();
  renderFinanceModule();
  renderNotificationsModule();
  renderCmsModule();

  if (authStore.isStaff()) loadAdminData();

  // Ouve eventos de encomendas para manter tudo sincronizado
  window.addEventListener('tradex:orders-changed', () => {
    renderAnalyticsModule();
    renderOrdersModule();
    renderFinanceModule();
    updateOrderSelectInNotifications();
  });

  window.addEventListener('tradex:products-changed', () => {
    renderProductsModule();
  });

  window.addEventListener('tradex:payments-changed', () => {
    renderAnalyticsModule();
    renderFinanceModule();
  });
}

// Carrega encomendas, pagamentos, produtos, fornecedores e lotes a partir da API
async function loadAdminData() {
  renderOperatorHeader();
  await authStore.sync();
  await loadCms();
  const products = await api.products.list({ includeInactive: 1 });
  if (products.ok) {
    PRODUCTS_DATA.splice(0, PRODUCTS_DATA.length, ...products.data.data);
    renderProductsModule();
    renderCmsModule();
  }
  refreshAdminExtras();
  refreshConversations();
}

function renderOperatorHeader() {
  const me = authStore.getUser();
  if (!me) return;
  const name = `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.email;
  const initials = name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const elName = document.getElementById('adminNameHeader');
  const elAvatar = document.getElementById('adminAvatarHeader');
  const elRole = document.querySelector('.operator-role');
  if (elName) elName.textContent = name;
  if (elAvatar) elAvatar.textContent = initials;
  if (elRole) elRole.textContent = me.role === 'ADMIN' ? 'Administrador' : 'Equipa TradeX';
}

// 0. Controlo de Acesso e Autenticação de Administrador
function checkAdminAuth() {
  const overlay = document.getElementById('adminAuthGuardOverlay');
  const form = document.getElementById('formAdminLogin');
  const feedback = document.getElementById('adminLoginFeedback');
  const emailInput = document.getElementById('adminLoginEmail');
  const passInput = document.getElementById('adminLoginPassword');
  const logoutBtn = document.getElementById('btnAdminLogout');

  if (authStore.isStaff()) {
    overlay?.classList.remove('visible');
  } else {
    overlay?.classList.add('visible');
  }

  logoutBtn?.addEventListener('click', () => {
    authStore.clearSession();
    authStore.notifyAuthChange();
    window.location.reload();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim().toLowerCase();
    const pass = passInput?.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const result = await authStore.login(email, pass);
    if (submitBtn) submitBtn.disabled = false;

    if (result.ok && authStore.isStaff()) {
      overlay?.classList.remove('visible');
      if (passInput) passInput.value = '';
      loadAdminData();
      return;
    }

    if (result.ok) {
      // Conta válida mas sem permissões de backoffice
      authStore.clearSession();
      authStore.notifyAuthChange();
    }

    if (feedback) {
      feedback.className = 'auth-feedback error visible';
      feedback.textContent = result.ok
        ? 'Esta conta não tem acesso ao backoffice.'
        : (result.message || 'E-mail ou palavra-passe incorretos.');
    }
  });

  // Sessão expirada durante o uso
  window.addEventListener('tradex:auth-changed', () => {
    if (!authStore.isStaff()) overlay?.classList.add('visible');
  });
}

// 1. Navegação por Abas do Painel Administrativo
function setupAdminNavigation() {
  const navBtns = document.querySelectorAll('.admin-nav-item');
  const panels = document.querySelectorAll('.admin-tab-panel');
  const mobileToggle = document.getElementById('btnToggleAdminSidebar');
  const sidebar = document.getElementById('adminSidebar');

  mobileToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (!tab) return;

      navBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(`adminPanel${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      sidebar?.classList.remove('open');
    });
  });

  document.getElementById('btnRefreshAnalytics')?.addEventListener('click', () => {
    renderAnalyticsModule();
  });
}

// 2. Módulo de Analytics / Visão Geral
function renderAnalyticsModule() {
  const orders = authStore.getOrders();
  const payments = authStore.getPayments();

  const totalRevenue = orders
    .filter(o => !['CANCELLED', 'RETURNED'].includes(o.status))
    .reduce((acc, o) => acc + (o.financial?.totalAoa || 0), 0);
  const transitCount = orders.filter(o => ['PROCESSING_SUPPLIER', 'IN_INTERNATIONAL_TRANSIT', 'ARRIVED_IN_ANGOLA'].includes(o.status)).length;

  const elRevenue = document.getElementById('kpiAdminRevenue');
  const elOrders = document.getElementById('kpiAdminOrders');
  const elTransit = document.getElementById('kpiAdminTransit');
  const elBadge = document.getElementById('adminOrdersCountBadge');

  if (elRevenue) elRevenue.textContent = cartStore.formatAoa(totalRevenue);
  if (elOrders) elOrders.textContent = orders.length;
  if (elTransit) elTransit.textContent = transitCount;
  if (elBadge) elBadge.textContent = orders.length;

  const elPendingPayments = document.getElementById('kpiAdminPendingPayments');
  if (elPendingPayments) {
    elPendingPayments.textContent = payments.filter(p => p.status === 'REVIEW_PENDING' || p.status === 'PENDING').length;
  }

  // Lista de Atividades Recentes
  const activityList = document.getElementById('adminRecentActivityList');
  if (activityList) {
    const recentActivities = [];

    orders.slice(0, 5).forEach(o => {
      recentActivities.push({
        title: `Nova Encomenda ${o.number}`,
        desc: `Cliente: ${o.customer?.name} • Valor: ${cartStore.formatAoa(o.financial?.totalAoa || 0)}`,
        date: new Date(o.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        tag: 'Encomenda'
      });
    });

    payments.filter(p => p.status === 'APPROVED').slice(0, 3).forEach(p => {
      recentActivities.push({
        title: `Liquidação Confirmada ${p.orderNumber}`,
        desc: `${p.methodName} • ${cartStore.formatAoa(p.amountAoa)}`,
        date: new Date(p.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        tag: 'Pagamento'
      });
    });

    activityList.innerHTML = recentActivities.map(act => `
      <li class="admin-activity-item">
        <div class="activity-bullet"></div>
        <div class="activity-content">
          <div class="activity-head">
            <strong>${act.title}</strong>
            <span class="activity-date">${act.date}</span>
          </div>
          <p class="activity-desc">${act.desc}</p>
        </div>
      </li>
    `).join('');
  }
}

// 3. Módulo de Gestão de Encomendas & Estados
const ordersView = { filter: 'all', search: '', mode: 'all', delivery: 'all', period: 'all' };

function bindOrdersModule() {
  const searchInput = document.getElementById('adminOrderSearchInput');
  const filterPills = document.querySelectorAll('#adminOrderStateFilters .admin-filter-pill');
  const tbody = document.getElementById('adminOrdersTableBody');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      ordersView.filter = pill.getAttribute('data-filter') || 'all';
      renderOrdersModule();
    });
  });

  searchInput?.addEventListener('input', (e) => {
    ordersView.search = e.target.value.trim().toLowerCase();
    renderOrdersModule();
  });

  [['adminOrderModeFilter', 'mode'], ['adminOrderDeliveryFilter', 'delivery'], ['adminOrderPeriodFilter', 'period']].forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      ordersView[key] = e.target.value;
      renderOrdersModule();
    });
  });

  tbody?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-open-status-modal');
    if (!btn) return;
    const order = authStore.getOrderById(btn.getAttribute('data-order-number'));
    if (order) openStatusModal(order);
  });
}

function renderOrdersModule() {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;
  let orders = authStore.getOrders();

  if (ordersView.mode !== 'all') orders = orders.filter(o => o.logistics?.shippingModeKey === ordersView.mode);
  if (ordersView.delivery !== 'all') orders = orders.filter(o => o.logistics?.deliveryMethod === ordersView.delivery);
  if (ordersView.period !== 'all') {
    const since = Date.now() - Number(ordersView.period) * 86400000;
    orders = orders.filter(o => new Date(o.createdAt).getTime() >= since);
  }

  if (ordersView.filter !== 'all') {
    orders = orders.filter(o => o.status === ordersView.filter || o.payment?.status === ordersView.filter);
  }

  if (ordersView.search) {
    const q = ordersView.search;
    orders = orders.filter(o =>
      o.number.toLowerCase().includes(q) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(q))
    );
  }

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty-message">Nenhuma encomenda encontrada com os filtros selecionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    let statusBadge = 'status-badge-transit';
    if (order.status === 'DELIVERED') statusBadge = 'status-badge-delivered';
    else if (order.status === 'AWAITING_PAYMENT' || order.status === 'CANCELLED') statusBadge = 'status-badge-pending';
    else if (order.status === 'PAYMENT_CONFIRMED') statusBadge = 'status-badge-paid';

    const statusLabel = order.status === 'AWAITING_PAYMENT' && order.payment?.status === 'REVIEW_PENDING'
      ? 'Comprovativo por Validar'
      : (ORDER_STATUS_LABELS[order.status] || order.status);

    return `
      <tr>
        <td>
          <strong class="pay-tx-code">${order.number}</strong>
          ${order.isGuest ? '<span class="table-sub-detail">Convidado</span>' : ''}
        </td>
        <td>
          <strong>${escapeHtml(order.customer?.name || 'Cliente')}</strong>
          <span class="table-sub-detail">${escapeHtml(order.customer?.email || '')}</span>
        </td>
        <td>${order.logistics?.shippingMode || 'Marítimo'}</td>
        <td>${new Date(order.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })}</td>
        <td>
          <strong class="pay-amount">${cartStore.formatAoa(order.financial?.totalAoa || 0)}</strong>
        </td>
        <td>
          <span class="client-order-badge ${statusBadge}">${statusLabel}</span>
        </td>
        <td>
          <button type="button" class="btn-dark btn-xs btn-open-status-modal" data-order-number="${order.number}">
            Alterar Estado &rarr;
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Modal da Máquina de Estados da Encomenda
function setupOrderStatusModal() {
  const modal = document.getElementById('orderStatusModalOverlay');
  const btnClose = document.getElementById('btnCloseStatusModal');
  const form = document.getElementById('formUpdateOrderStatus');

  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderNum = document.getElementById('statusModalOrderId')?.value;
    const newStatus = document.getElementById('selectNewOrderStatus')?.value;
    const responsible = document.getElementById('statusModalResponsible')?.value;
    const notes = document.getElementById('statusModalNotes')?.value;
    const notifyClient = document.getElementById('checkNotifyClient')?.checked;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) submitBtn.disabled = true;
    const res = await api.orders.updateStatus(orderNum, { status: newStatus, note: notes, responsible, notify: notifyClient });
    if (submitBtn) submitBtn.disabled = false;

    if (!res.ok) {
      alert(res.message || 'Não foi possível actualizar o estado.');
      return;
    }

    const order = authStore.cacheOrder(res.data.data);
    if (newStatus === 'PAYMENT_CONFIRMED') authStore.refreshPayments();

    if (notifyClient) setTimeout(refreshNotificationLogs, 1500);

    modal?.classList.remove('visible');
  });
}

function openStatusModal(order) {
  const modal = document.getElementById('orderStatusModalOverlay');
  const title = document.getElementById('statusModalOrderNum');
  const inpId = document.getElementById('statusModalOrderId');
  const select = document.getElementById('selectNewOrderStatus');
  const txtNotes = document.getElementById('statusModalNotes');

  if (!modal) return;
  if (title) title.textContent = `Atualizar Estado: ${order.number}`;
  if (inpId) inpId.value = order.number;
  if (select) select.value = order.status || 'AWAITING_PAYMENT';
  if (txtNotes) txtNotes.value = '';
  const inpResp = document.getElementById('statusModalResponsible');
  const me = authStore.getUser();
  if (inpResp && me) inpResp.value = `${me.firstName} ${me.lastName}`.trim() || me.email;

  modal.classList.add('visible');
}

// 4. Módulo de Produtos & Catálogo
function renderProductsModule() {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  tbody.innerHTML = PRODUCTS_DATA.map(prod => `
    <tr>
      <td>
        <div class="admin-prod-cell">
          <img src="${prod.image}" alt="${prod.title}" class="admin-prod-thumb" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=200';" />
          <div>
            <strong>${prod.title}</strong>
            <span class="table-sub-detail">${prod.specs || ''}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="admin-cat-pill">${prod.categoryLabel || prod.category.toUpperCase()}</span>
        ${prod.active === false ? '<span class="table-sub-detail">Inactivo</span>' : ''}
      </td>
      <td>${prod.origin || 'Guangdong, China'}</td>
      <td>${prod.moq || '1 Unidade'}</td>
      <td>
        <strong class="pay-amount">${cartStore.formatAoa(prod.priceAoa)}</strong>
      </td>
      <td>
        <button type="button" class="btn-action-edit btn-edit-product" data-product-id="${prod.id}" title="Editar Todos os Dados do Produto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Editar Produto</span>
        </button>
        <button type="button" class="btn-outline-dark btn-xs btn-toggle-product" data-product-id="${prod.id}" data-active="${prod.active === false ? '0' : '1'}">
          ${prod.active === false ? 'Activar' : 'Desactivar'}
        </button>
        <button type="button" class="btn-outline-dark btn-xs btn-delete-product" data-product-id="${prod.id}" style="color:#b91c1c;border-color:#fca5a5">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// Activar / desactivar produto (desactivado deixa de aparecer na loja; encomendas antigas mantêm-se)
document.getElementById('adminProductsTableBody')?.addEventListener('click', async (e) => {
  const del = e.target.closest('.btn-delete-product');
  if (del) {
    const id = del.getAttribute('data-product-id');
    if (!confirm('Eliminar este produto definitivamente? Não pode ser desfeito. As encomendas antigas mantêm o registo dos itens.')) return;
    del.disabled = true;
    const r = await api.products.remove(id);
    del.disabled = false;
    if (!r.ok) return alert(r.message || 'Não foi possível eliminar o produto.');
    const i = PRODUCTS_DATA.findIndex(p => p.id === id);
    if (i >= 0) PRODUCTS_DATA.splice(i, 1);
    renderProductsModule();
    renderCmsModule();
    return;
  }
  const btn = e.target.closest('.btn-toggle-product');
  if (!btn) return;
  const id = btn.getAttribute('data-product-id');
  const activate = btn.getAttribute('data-active') === '0';
  if (!activate && !confirm('Desactivar este produto? Deixa de aparecer na loja.')) return;
  btn.disabled = true;
  const res = activate ? await api.products.update(id, { active: true }) : await api.products.deactivate(id);
  btn.disabled = false;
  if (!res.ok) return alert(res.message || 'Não foi possível actualizar o produto.');
  const idx = PRODUCTS_DATA.findIndex(p => p.id === id);
  if (idx >= 0) PRODUCTS_DATA[idx] = res.data.data;
  renderProductsModule();
  renderCmsModule();
});

// Modal de Criação e Edição Completa de Produtos com Galeria Dinâmica Local
function setupProductModal() {
  const modal = document.getElementById('productModalOverlay');
  const btnOpen = document.getElementById('btnOpenNewProductModal');
  const btnClose = document.getElementById('btnCloseProductModal');
  const form = document.getElementById('formProductEdit');
  const btnAddHeader = document.getElementById('btnAddPhotoSlot');

  const titleModal = document.getElementById('productModalTitle');
  const subModal = document.getElementById('productModalSubtitle');
  const btnSubmit = document.getElementById('btnSubmitProductForm');

  const inpId = document.getElementById('prodFormId');
  const inpTitle = document.getElementById('prodFormTitle');
  const inpCategory = document.getElementById('prodFormCategory');
  const inpPrice = document.getElementById('prodFormPrice');
  const inpUnit = document.getElementById('prodFormUnit');
  const inpMoq = document.getElementById('prodFormMoq');
  const inpBadge = document.getElementById('prodFormBadge');
  const inpOrigin = document.getElementById('prodFormOrigin');
  const inpOriginPort = document.getElementById('prodFormOriginPort');
  const inpTransit = document.getElementById('prodFormTransitTime');
  const inpPacking = document.getElementById('prodFormPacking');
  const inpSpecs = document.getElementById('prodFormSpecs');
  const inpDesc = document.getElementById('prodFormDescription');

  // Estado das Fotografias Carregadas Localmente (Array dinâmico de N ângulos)
  let modalPhotosState = [];

  function renderModalPhotoCards() {
    const grid = document.getElementById('productPhotoGrid');
    if (!grid) return;

    grid.innerHTML = modalPhotosState.map((photo, idx) => {
      const isPrimary = idx === 0;
      const badgeLabel = isPrimary ? 'Ângulo 1: Principal *' : (photo.label || `Ângulo ${idx + 1}`);
      const hasImage = Boolean(photo.url);

      return `
        <div class="admin-upload-card" data-photo-id="${photo.id}">
          <div class="upload-card-header">
            <span class="upload-badge-tag ${isPrimary ? 'required' : ''}">${badgeLabel}</span>
            ${!isPrimary ? `
              <button type="button" class="btn-delete-slot" data-action="delete-slot" data-photo-id="${photo.id}" title="Remover este ângulo">&times;</button>
            ` : ''}
          </div>
          <div class="upload-dropzone ${hasImage ? 'has-image' : ''}" data-photo-id="${photo.id}">
            <input type="file" class="upload-file-input" accept="image/*" data-photo-id="${photo.id}" />
            
            <div class="upload-empty-state">
              <svg class="upload-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span class="upload-btn-fake">Carregar Ficheiro</span>
              <span class="upload-drop-hint">arraste ou clique</span>
            </div>

            <div class="upload-preview-container">
              <img src="${photo.url || ''}" class="upload-preview-img" alt="${badgeLabel}" />
              <div class="upload-preview-overlay">
                <span class="upload-overlay-text">Substituir Ficheiro</span>
              </div>
            </div>
          </div>
          <div class="upload-card-footer">
            <span class="upload-filename">${photo.fileName || (isPrimary ? 'Ficheiro obrigatório' : 'Opcional')}</span>
            ${hasImage ? `
              <button type="button" class="btn-clear-upload" data-action="clear-image" data-photo-id="${photo.id}" title="Limpar ficheiro">&times;</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('') + `
      <!-- Card Interativo para Adicionar Mais Fotos (+ Card) -->
      <div class="upload-add-card" id="btnAddPhotoGridCard" title="Adicionar mais um ângulo fotográfico">
        <svg class="upload-add-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span class="upload-add-card-title">+ Adicionar Foto</span>
        <span class="upload-add-card-sub">Novo ângulo ou detalhe</span>
      </div>
    `;

    attachPhotoGridEvents();
  }

  function attachPhotoGridEvents() {
    const grid = document.getElementById('productPhotoGrid');
    if (!grid) return;

    // Clique no Card "+ Adicionar Foto"
    document.getElementById('btnAddPhotoGridCard')?.addEventListener('click', () => {
      addNewPhotoSlot();
    });

    // Eventos de cada Card de Imagem
    grid.querySelectorAll('.admin-upload-card').forEach(card => {
      const photoId = card.getAttribute('data-photo-id');
      const photo = modalPhotosState.find(p => p.id === photoId);
      if (!photo) return;

      const dropzone = card.querySelector('.upload-dropzone');
      const fileInput = card.querySelector('.upload-file-input');

      // Clique na dropzone abre a seleção de ficheiros locais
      dropzone?.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="clear-image"]')) return;
        fileInput?.click();
      });

      fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) processLocalImageFile(file, photo);
      });

      // Suporte Drag & Drop de imagens locais do computador
      dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });

      dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const file = e.dataTransfer?.files?.[0];
        if (file) processLocalImageFile(file, photo);
      });

      // Limpar Imagem
      card.querySelector('[data-action="clear-image"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        photo.url = '';
        photo.fileName = '';
        renderModalPhotoCards();
      });

      // Remover Ângulo Adicional
      card.querySelector('[data-action="delete-slot"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        modalPhotosState = modalPhotosState.filter(p => p.id !== photoId);
        renderModalPhotoCards();
      });
    });
  }

  // Otimização e Conversão de Imagens Locais (FileReader + Canvas)
  function processLocalImageFile(file, photoObj) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor selecione um ficheiro de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionamento inteligente para máx 1200px para garantir alta fidelidade e velocidade instantânea
        const MAX_DIM = 1200;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        photoObj.url = dataUrl;
        photoObj.fileName = `${file.name} (${sizeKb} KB)`;
        renderModalPhotoCards();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Adiciona novo ângulo ou foto dinamicamente
  function addNewPhotoSlot() {
    const nextNum = modalPhotosState.length + 1;
    const labelsMap = {
      2: 'Ângulo 2: Detalhes Técnicos',
      3: 'Ângulo 3: Embalagem / Fábrica',
      4: 'Ângulo 4: Painel / Conexões',
      5: 'Ângulo 5: Dimensões / Carga',
      6: 'Ângulo 6: Aplicação Prática'
    };
    modalPhotosState.push({
      id: `photo_slot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      url: '',
      label: labelsMap[nextNum] || `Ângulo ${nextNum}`,
      fileName: ''
    });
    renderModalPhotoCards();
  }

  // Abre para CRIAR novo produto
  btnOpen?.addEventListener('click', () => {
    form?.reset();
    if (inpId) inpId.value = '';
    if (titleModal) titleModal.textContent = 'Novo Equipamento / Produto';
    if (subModal) subModal.textContent = 'Adicione novas mercadorias para importação da China com cotação em Kwanzas e fotos locais.';
    if (btnSubmit) btnSubmit.textContent = 'Publicar no Catálogo';

    // Inicia com os 3 ângulos sugeridos pré-configurados, permitindo adicionar mais (+)
    modalPhotosState = [
      { id: 'slot-1', url: '', label: 'Ângulo 1: Principal *', fileName: '' },
      { id: 'slot-2', url: '', label: 'Ângulo 2: Detalhes Técnicos', fileName: '' },
      { id: 'slot-3', url: '', label: 'Ângulo 3: Embalagem / Fábrica', fileName: '' }
    ];
    renderModalPhotoCards();
    modal?.classList.add('visible');
  });

  // Botão "+ Adicionar Ângulo / Foto" no Topo da Seção
  btnAddHeader?.addEventListener('click', () => {
    addNewPhotoSlot();
  });

  // Abre para EDITAR produto existente
  document.getElementById('adminProductsTableBody')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.btn-edit-product');
    if (!btn) return;
    {
      const prodId = btn.getAttribute('data-product-id');
      const prod = PRODUCTS_DATA.find(p => p.id === prodId);
      if (!prod) return;

      if (inpId) inpId.value = prod.id;
      if (titleModal) titleModal.textContent = `Editar Produto: ${prod.title}`;
      if (subModal) subModal.textContent = `Modifique todos os dados técnicos, comerciais, logísticos e fotografias de ${prod.id}.`;
      if (btnSubmit) btnSubmit.textContent = 'Salvar Alterações do Produto';

      if (inpTitle) inpTitle.value = prod.title || '';
      if (inpCategory) inpCategory.value = prod.category || 'solar';
      if (inpPrice) inpPrice.value = prod.priceAoa || 0;
      if (inpUnit) inpUnit.value = prod.unit || 'unidade';
      if (inpMoq) inpMoq.value = prod.moq || '1 Unidade';
      if (inpBadge) inpBadge.value = prod.badge || '';
      if (inpOrigin) inpOrigin.value = prod.origin || '';
      if (inpOriginPort) inpOriginPort.value = prod.logistics?.originPort || '';
      if (inpTransit) inpTransit.value = prod.logistics?.transitTimeSea || '';
      if (inpPacking) inpPacking.value = prod.logistics?.packing || '';
      if (inpSpecs) inpSpecs.value = prod.specs || '';
      if (inpDesc) inpDesc.value = prod.description || '';
      const supSel = document.getElementById('prodFormSupplier');
      if (supSel) supSel.value = prod.supplierId || '';

      // Carrega fotos existentes do produto
      modalPhotosState = [];
      if (Array.isArray(prod.images) && prod.images.length > 0) {
        modalPhotosState = prod.images.map((img, idx) => ({
          id: `slot-${idx + 1}-${Date.now()}`,
          url: img.url || '',
          label: img.label || (idx === 0 ? 'Ângulo 1: Principal *' : `Ângulo ${idx + 1}`),
          fileName: (img.url || '').startsWith('data:') ? 'Ficheiro local' : 'Imagem existente do catálogo'
        }));
      } else if (prod.image) {
        modalPhotosState = [
          { id: 'slot-1', url: prod.image, label: 'Ângulo 1: Principal *', fileName: 'Imagem existente' }
        ];
      }

      if (modalPhotosState.length === 0) {
        modalPhotosState.push({ id: 'slot-1', url: '', label: 'Ângulo 1: Principal *', fileName: '' });
      }

      renderModalPhotoCards();
      modal?.classList.add('visible');
    }
  });

  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  // Submissão do formulário (Criação ou Edição com fotos dinâmicas)
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prodId = inpId?.value;
    const cat = inpCategory?.value || 'solar';

    const categoryLabelsMap = {
      solar: 'Energia Solar',
      construction: 'Construção & Equipamento',
      machinery: 'Maquinaria & Geradores',
      electronics: 'Eletrónicos & Iluminação'
    };

    // Validação de fotos: pelo menos a imagem principal deve estar carregada
    const validPhotos = modalPhotosState.filter(p => Boolean(p.url));
    if (validPhotos.length === 0 || !modalPhotosState[0]?.url) {
      alert('Por favor carregue pelo menos o ficheiro local da Imagem Principal / Ângulo 1.');
      return;
    }

    // Fotografias carregadas localmente: envia para o servidor e usa o URL público
    if (btnSubmit) btnSubmit.disabled = true;
    try {
      for (const photo of modalPhotosState) {
        if (!photo.url?.startsWith('data:')) continue;
        const blob = await (await fetch(photo.url)).blob();
        const file = new File([blob], photo.fileName || 'foto.jpg', { type: blob.type || 'image/jpeg' });
        const up = await api.admin.uploadImage(file);
        if (!up.ok) throw new Error(up.message || 'Falha no envio da fotografia.');
        photo.url = up.data.data.url;
      }
    } catch (err) {
      if (btnSubmit) btnSubmit.disabled = false;
      alert(err.message);
      return;
    }
    if (btnSubmit) btnSubmit.disabled = false;

    const primaryUrl = modalPhotosState[0].url;
    const imagesArray = validPhotos.map((p, idx) => ({
      url: p.url,
      label: idx === 0 ? 'Ângulo 1: Visão Principal' : (p.label || `Ângulo ${idx + 1}`)
    }));

    // Se tiver menos de 3 fotos, complementa para a galeria com a imagem principal
    while (imagesArray.length < 3) {
      imagesArray.push({
        url: primaryUrl,
        label: `Ângulo ${imagesArray.length + 1}: Detalhes`
      });
    }

    const updatedData = {
      title: inpTitle?.value.trim() || 'Equipamento TradeX',
      category: cat,
      categoryLabel: categoryLabelsMap[cat] || cat.toUpperCase(),
      priceAoa: Number(inpPrice?.value) || 0,
      unit: inpUnit?.value.trim() || 'unidade',
      moq: inpMoq?.value.trim() || '1 Unidade',
      badge: inpBadge?.value.trim() || 'Qualidade Certificada',
      origin: inpOrigin?.value.trim() || 'Guangdong, China',
      specs: inpSpecs?.value.trim() || `Origem: ${inpOrigin?.value || 'China'} | MOQ: ${inpMoq?.value || '1 Unidade'}`,
      description: inpDesc?.value.trim() || '',
      image: primaryUrl,
      images: imagesArray,
      logistics: {
        originPort: inpOriginPort?.value.trim() || 'Porto de Nansha / Shenzhen (China)',
        destinationPort: 'Porto de Luanda (Angola)',
        transitTimeSea: inpTransit?.value.trim() || '30 a 60 dias',
        packing: inpPacking?.value.trim() || 'Palete reforçada com filme retrátil'
      }
    };

    const { categoryLabel, ...payload } = updatedData;
    payload.logistics = { ...payload.logistics, transitTimeAir: '5 a 15 dias' };
    payload.supplierId = document.getElementById('prodFormSupplier')?.value || null;

    if (btnSubmit) btnSubmit.disabled = true;
    const res = prodId ? await api.products.update(prodId, payload) : await api.products.create(payload);
    if (btnSubmit) btnSubmit.disabled = false;

    if (!res.ok) {
      alert(res.message || 'Não foi possível guardar o produto.');
      return;
    }

    const saved = res.data.data;
    const idx = PRODUCTS_DATA.findIndex(p => p.id === saved.id);
    if (idx >= 0) PRODUCTS_DATA[idx] = saved; else PRODUCTS_DATA.unshift(saved);

    renderProductsModule();
    renderCmsModule();
    modal?.classList.remove('visible');
    form.reset();
  });
}

// 5. Módulo de Fornecedores na China
function renderSuppliersModule() {
  return; // ver admin-extra.js
}

// 6. Módulo de Logística & Remessas Internacionais
function renderLogisticsModule() {
  return; // ver admin-extra.js
}

// 7. Módulo Financeiro & Validação de Comprovativos
function renderFinanceModule() {
  const tbody = document.getElementById('adminFinanceTableBody');
  if (!tbody) return;

  const payments = authStore.getPayments();
  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty-message">Nenhum pagamento registado para conciliação.</td></tr>`;
    return;
  }

  tbody.innerHTML = payments.map(pay => {
    const isApproved = pay.status === 'APPROVED';
    const isReview = pay.status === 'REVIEW_PENDING';

    let badgeClass = 'table-badge-pending';
    let badgeLabel = 'Pendente';

    if (isApproved) {
      badgeClass = 'table-badge-approved';
      badgeLabel = 'Validado';
    } else if (isReview) {
      badgeClass = 'table-badge-pending';
      badgeLabel = 'Comprovativo por Validar';
    } else if (pay.status === 'DECLINED') {
      badgeLabel = 'Rejeitado';
    } else {
      badgeLabel = 'Aguarda Transferência';
    }

    return `
      <tr>
        <td>
          <strong class="pay-tx-code">${pay.reference || pay.transactionId || '—'}</strong>
        </td>
        <td>
          <strong>${pay.orderNumber}</strong>
          ${pay.customerName ? `<span class="table-sub-detail">${escapeHtml(pay.customerName)}</span>` : ''}
        </td>
        <td>${pay.methodName || 'Transferência Bancária'}</td>
        <td>${new Date(pay.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <strong class="pay-amount">${cartStore.formatAoa(pay.amountAoa)}</strong>
        </td>
        <td>
          <span class="table-pay-badge ${badgeClass}">${badgeLabel}</span>
          ${pay.status === 'DECLINED' && pay.rejectionReason ? `<span class="table-sub-detail">Motivo: ${escapeHtml(pay.rejectionReason)}</span>` : ''}
          ${pay.proofUploadedAt ? `<span class="table-sub-detail">Enviado ${new Date(pay.proofUploadedAt).toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>` : ''}
        </td>
        <td>
          ${pay.hasProof ? `
            <button type="button" class="btn-outline-dark btn-xs btn-view-proof" data-pay-id="${pay.id}" title="${escapeHtml(pay.proofFileName || 'Comprovativo')}">
              Ver comprovativo
            </button>
          ` : ''}
          ${isReview ? `
            <button type="button" class="btn-primary-action btn-xs btn-conciliate-pay" data-pay-id="${pay.id}" data-approve="1">
              Aprovar
            </button>
            <button type="button" class="btn-outline-dark btn-xs btn-conciliate-pay" data-pay-id="${pay.id}" data-approve="0">
              Rejeitar
            </button>
          ` : isApproved ? `
            <span class="table-sub-detail">${pay.reviewedBy ? `Validado por ${escapeHtml(pay.reviewedBy)}` : 'Validado'}</span>
          ` : `
            <span class="table-sub-detail">Aguarda comprovativo do cliente</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-view-proof').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Abre a janela já no clique para não ser bloqueada como pop-up
      const win = window.open('', '_blank');
      btn.disabled = true;
      const res = await api.payments.proofBlob(btn.getAttribute('data-pay-id'));
      btn.disabled = false;
      if (!res.ok) {
        win?.close();
        alert(res.message);
        return;
      }
      const url = URL.createObjectURL(res.blob);
      if (win) win.location.href = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  });

  tbody.querySelectorAll('.btn-conciliate-pay').forEach(btn => {
    btn.addEventListener('click', async () => {
      const payId = btn.getAttribute('data-pay-id');
      const approved = btn.getAttribute('data-approve') === '1';
      let note;
      if (!approved) {
        note = prompt('Motivo da rejeição (visível para o cliente):', 'Transferência não encontrada no extracto bancário.');
        if (note === null) return;
      }
      btn.disabled = true;
      const res = await api.payments.review(payId, approved, note || undefined);
      btn.disabled = false;
      if (!res.ok) {
        alert(res.message || 'Não foi possível validar o pagamento.');
        return;
      }
      await authStore.sync();
    });
  });
}

// 8. Notificações: ver admin-conversations.js
function renderNotificationsModule() {}
function updateOrderSelectInNotifications() { fillNotificationOrders(); }

// 8. Módulo de CMS & Gestão de Conteúdos Públicos
// ==========================================================================

let activeCmsTab = 'featured';

function renderCmsModule() {
  setupCmsSubNavigation();
  renderCmsCurrentSubView();
  setupCmsModal();
}

function setupCmsSubNavigation() {
  const pills = document.querySelectorAll('#cmsSubNav [data-cms-tab]');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      activeCmsTab = pill.getAttribute('data-cms-tab') || 'featured';

      document.querySelectorAll('.cms-sub-panel').forEach(panel => {
        panel.classList.remove('active');
      });

      let targetId = 'cmsPanelFeatured';
      if (activeCmsTab === 'featured') targetId = 'cmsPanelFeatured';
      else if (activeCmsTab === 'catalog-hero') targetId = 'cmsPanelCatalogHero';
      else targetId = `cmsPanel${activeCmsTab.charAt(0).toUpperCase() + activeCmsTab.slice(1)}`;

      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      renderCmsCurrentSubView();
    });
  });
}

function renderCmsCurrentSubView() {
  if (activeCmsTab === 'featured') renderCmsFeaturedTable();
  else if (activeCmsTab === 'catalog-hero') renderCmsCatalogHeroTable();
  else if (activeCmsTab === 'banners') renderCmsBannersTable();
  else if (activeCmsTab === 'promotions') renderCmsPromotionsTable();
  else if (activeCmsTab === 'news') renderCmsNewsTable();
  else if (activeCmsTab === 'faqs') renderCmsFaqsTable();
  else if (activeCmsTab === 'pages') renderCmsPagesTable();
}

// 8.1 Gestão do "Catálogo em Destaque" (index.html)
function renderCmsFeaturedTable() {
  const tbody = document.getElementById('cmsTableFeaturedProducts');
  const featConfig = cmsStore.getFeaturedCatalog();

  // Preenche os campos de configuração da secção
  const inpEyebrow = document.getElementById('cmsFeaturedEyebrow');
  const inpTitle = document.getElementById('cmsFeaturedTitle');
  const inpSub = document.getElementById('cmsFeaturedSubtitle');
  const btnSave = document.getElementById('btnSaveFeaturedTexts');
  const feedback = document.getElementById('feedbackFeaturedTexts');

  if (inpEyebrow && featConfig.eyebrow) inpEyebrow.value = featConfig.eyebrow;
  if (inpTitle && featConfig.title) inpTitle.value = featConfig.title;
  if (inpSub && featConfig.subtitle) inpSub.value = featConfig.subtitle;

  if (btnSave && !btnSave.dataset.bound) {
    btnSave.dataset.bound = 'true';
    btnSave.addEventListener('click', () => {
      cmsStore.saveFeaturedCatalog({
        eyebrow: inpEyebrow?.value.trim() || 'CATÁLOGO EM DESTAQUE',
        title: inpTitle?.value.trim() || 'Produtos com fornecedor validado na China',
        subtitle: inpSub?.value.trim() || ''
      });
      if (feedback) {
        feedback.className = 'auth-feedback success visible';
        feedback.textContent = '✅ Textos da secção "Catálogo em Destaque" atualizados na Homepage!';
        setTimeout(() => feedback.classList.remove('visible'), 4000);
      }
    });
  }

  if (!tbody) return;

  tbody.innerHTML = PRODUCTS_DATA.map(prod => {
    const isFeatured = cmsStore.isProductFeatured(prod.id);
    return `
      <tr>
        <td>
          <div class="admin-prod-cell">
            <img src="${prod.image}" alt="${prod.title}" class="admin-prod-thumb" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=200';" />
            <div>
              <strong>${prod.title}</strong>
              <span class="table-sub-detail">${prod.specs || ''}</span>
            </div>
          </div>
        </td>
        <td><span class="admin-cat-pill">${prod.categoryLabel || prod.category.toUpperCase()}</span></td>
        <td>${prod.origin || 'China'}</td>
        <td><strong class="pay-amount">${cartStore.formatAoa(prod.priceAoa)}</strong></td>
        <td>
          <span class="${isFeatured ? 'cms-badge-active' : 'cms-badge-paused'}">
            ${isFeatured ? '● Em Destaque na Homepage' : '○ Apenas no Catálogo Geral'}
          </span>
        </td>
        <td>
          <div class="cms-actions-cell">
            <button type="button" class="btn-action-cms-toggle" data-action="toggle-featured-prod" data-id="${prod.id}">
              ${isFeatured ? 'Remover Destaque' : '★ Destacar na Homepage'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="toggle-featured-prod"]').forEach(btn => {
    btn.onclick = () => {
      const prodId = btn.getAttribute('data-id');
      cmsStore.toggleProductFeatured(prodId);
      renderCmsFeaturedTable();
    };
  });
}

// 8.2 Gestão do Hero Slider do Catálogo (catalogo.html)
function renderCmsCatalogHeroTable() {
  const tbody = document.getElementById('cmsTableCatalogHero');
  if (!tbody) return;
  const slides = cmsStore.getCatalogHeroSlides();

  tbody.innerHTML = slides.map(slide => `
    <tr>
      <td>
        <strong>${slide.title}</strong>
        <span class="table-sub-detail">${slide.lead || ''}</span>
      </td>
      <td><span class="admin-cat-pill">${slide.eyebrow || 'Destaque'}</span></td>
      <td>#${slide.order || 1}</td>
      <td>
        <img src="${slide.image}" alt="${slide.title}" class="admin-prod-thumb" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=200';" />
      </td>
      <td>
        <span class="${slide.active ? 'cms-badge-active' : 'cms-badge-paused'}">
          ${slide.active ? '● Ativo no Slider' : '○ Pausado'}
        </span>
      </td>
      <td>
        <div class="cms-actions-cell">
          <button type="button" class="btn-action-cms-edit" data-action="edit-catalog-hero" data-id="${slide.id}">Editar</button>
          <button type="button" class="btn-action-cms-toggle" data-action="toggle-catalog-hero" data-id="${slide.id}">
            ${slide.active ? 'Pausar' : 'Ativar'}
          </button>
          <button type="button" class="btn-action-cms-delete" data-action="delete-catalog-hero" data-id="${slide.id}">&times;</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCmsTableActions('catalogHeroSlides');
}

// 8.3 Banners Gerais da Loja
function renderCmsBannersTable() {
  const tbody = document.getElementById('cmsTableBanners');
  if (!tbody) return;
  const data = cmsStore.getData();

  tbody.innerHTML = data.banners.map(b => `
    <tr>
      <td>
        <strong>${b.title}</strong>
        <span class="table-sub-detail">${b.subtitle || ''}</span>
      </td>
      <td>${b.location}</td>
      <td>
        <span class="admin-cat-pill">${b.ctaText} &rarr; ${b.ctaLink}</span>
      </td>
      <td>
        <span class="${b.active ? 'cms-badge-active' : 'cms-badge-paused'}">
          ${b.active ? '● Ativo na Loja' : '○ Pausado'}
        </span>
      </td>
      <td>
        <div class="cms-actions-cell">
          <button type="button" class="btn-action-cms-edit" data-action="edit-banner" data-id="${b.id}">Editar</button>
          <button type="button" class="btn-action-cms-toggle" data-action="toggle-banner" data-id="${b.id}">
            ${b.active ? 'Pausar' : 'Ativar'}
          </button>
          <button type="button" class="btn-action-cms-delete" data-action="delete-banner" data-id="${b.id}">&times;</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCmsTableActions('banners');
}

// 8.4 Promoções & Cupões
function renderCmsPromotionsTable() {
  const tbody = document.getElementById('cmsTablePromotions');
  if (!tbody) return;
  const data = cmsStore.getData();

  tbody.innerHTML = data.promotions.map(p => `
    <tr>
      <td>
        <strong>${p.title}</strong>
        <span class="table-sub-detail">Categoria: ${p.category}</span>
      </td>
      <td><code>${p.code}</code></td>
      <td><strong class="pay-amount">${p.discount}</strong></td>
      <td>${p.validUntil}</td>
      <td>
        <span class="${p.active ? 'cms-badge-active' : 'cms-badge-paused'}">
          ${p.active ? '● Em Vigor' : '○ Encerrada'}
        </span>
      </td>
      <td>
        <div class="cms-actions-cell">
          <button type="button" class="btn-action-cms-edit" data-action="edit-promo" data-id="${p.id}">Editar</button>
          <button type="button" class="btn-action-cms-toggle" data-action="toggle-promo" data-id="${p.id}">
            ${p.active ? 'Pausar' : 'Ativar'}
          </button>
          <button type="button" class="btn-action-cms-delete" data-action="delete-promo" data-id="${p.id}">&times;</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCmsTableActions('promotions');
}

// 8.5 Notícias TradeX
function renderCmsNewsTable() {
  const tbody = document.getElementById('cmsTableNews');
  if (!tbody) return;
  const data = cmsStore.getData();

  tbody.innerHTML = data.news.map(n => `
    <tr>
      <td>
        <strong>${n.title}</strong>
        <span class="table-sub-detail">${n.summary}</span>
      </td>
      <td><span class="admin-cat-pill">${n.category}</span></td>
      <td>${n.date}</td>
      <td>${n.author}</td>
      <td><span class="cms-badge-active">● ${n.status}</span></td>
      <td>
        <div class="cms-actions-cell">
          <button type="button" class="btn-action-cms-edit" data-action="edit-news" data-id="${n.id}">Editar</button>
          <button type="button" class="btn-action-cms-delete" data-action="delete-news" data-id="${n.id}">&times;</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCmsTableActions('news');
}

// 8.6 FAQ
function renderCmsFaqsTable() {
  const tbody = document.getElementById('cmsTableFaqs');
  if (!tbody) return;
  const data = cmsStore.getData();

  tbody.innerHTML = data.faqs.map(f => `
    <tr>
      <td>
        <strong>${f.question}</strong>
        <span class="table-sub-detail">${f.answer}</span>
      </td>
      <td><span class="admin-cat-pill">${f.category}</span></td>
      <td>#${f.order}</td>
      <td>
        <span class="${f.active ? 'cms-badge-active' : 'cms-badge-paused'}">
          ${f.active ? '● Publicada' : '○ Oculta'}
        </span>
      </td>
      <td>
        <div class="cms-actions-cell">
          <button type="button" class="btn-action-cms-edit" data-action="edit-faq" data-id="${f.id}">Editar</button>
          <button type="button" class="btn-action-cms-toggle" data-action="toggle-faq" data-id="${f.id}">
            ${f.active ? 'Ocultar' : 'Publicar'}
          </button>
          <button type="button" class="btn-action-cms-delete" data-action="delete-faq" data-id="${f.id}">&times;</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCmsTableActions('faqs');
}

// 8.7 Páginas Institucionais
function renderCmsPagesTable() {
  const tbody = document.getElementById('cmsTablePages');
  if (!tbody) return;
  const data = cmsStore.getData();

  tbody.innerHTML = data.pages.map(p => `
    <tr>
      <td><strong>${p.title}</strong></td>
      <td><code>${p.slug}</code></td>
      <td>${p.lastUpdated}</td>
      <td><span class="cms-badge-active">● ${p.status}</span></td>
      <td>
        <div class="cms-actions-cell">
          <button type="button" class="btn-action-cms-edit" data-action="edit-page" data-id="${p.id}">Editar Conteúdo</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCmsTableActions('pages');
}

function attachCmsTableActions(sectionKey) {
  const data = cmsStore.getData();

  // Ação de Toggle Ativar/Pausar
  document.querySelectorAll(`.btn-action-cms-toggle`).forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = data[sectionKey]?.find(i => i.id === id);
      if (item) {
        item.active = !item.active;
        cmsStore.saveData(data);
        renderCmsCurrentSubView();
      }
    };
  });

  // Ação de Excluir
  document.querySelectorAll(`.btn-action-cms-delete`).forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Tem a certeza que deseja eliminar este item de conteúdo público?')) {
        data[sectionKey] = data[sectionKey].filter(i => i.id !== id);
        cmsStore.saveData(data);
        renderCmsCurrentSubView();
      }
    };
  });

  // Ação de Editar
  document.querySelectorAll(`.btn-action-cms-edit`).forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      openCmsModal(sectionKey, id);
    };
  });
}

function setupCmsModal() {
  const modal = document.getElementById('cmsModalOverlay');
  const btnOpen = document.getElementById('btnOpenCmsModal');
  const btnClose = document.getElementById('btnCloseCmsModal');
  const form = document.getElementById('formCmsItem');

  btnOpen?.addEventListener('click', () => {
    const targetKey = activeCmsTab === 'catalog-hero' ? 'catalogHeroSlides' : (activeCmsTab === 'featured' ? 'catalogHeroSlides' : activeCmsTab);
    openCmsModal(targetKey, null);
  });

  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCmsModalForm();
  });
}

function openCmsModal(sectionKey, editId) {
  const modal = document.getElementById('cmsModalOverlay');
  const title = document.getElementById('cmsModalTitle');
  const sub = document.getElementById('cmsModalSubtitle');
  const idInput = document.getElementById('cmsItemId');
  const typeInput = document.getElementById('cmsItemType');
  const fieldsContainer = document.getElementById('cmsDynamicFields');

  if (!modal || !fieldsContainer) return;

  if (idInput) idInput.value = editId || '';
  if (typeInput) typeInput.value = sectionKey;

  const data = cmsStore.getData();
  const existing = editId ? data[sectionKey]?.find(i => i.id === editId) : null;

  if (sectionKey === 'catalogHeroSlides' || sectionKey === 'catalog-hero') {
    title.textContent = existing ? 'Editar Slide do Catálogo (catalogo.html)' : 'Novo Slide do Catálogo (catalogo.html)';
    sub.textContent = 'Configure o banner principal de topo que aparece no Catálogo de Produtos.';
    fieldsContainer.innerHTML = `
      <div class="checkout-form-group">
        <label for="cmsFieldHeroTitle">Título Principal do Slide (H1) *</label>
        <input type="text" id="cmsFieldHeroTitle" class="checkout-input" value="${existing?.title || ''}" placeholder="Ex: Soluções solares com garantia de fábrica." required />
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldHeroEyebrow">Selo / Eyebrow do Slide</label>
          <input type="text" id="cmsFieldHeroEyebrow" class="checkout-input" value="${existing?.eyebrow || 'CHINA ➔ ANGOLA'}" placeholder="Ex: ENERGIA SOLAR & SISTEMAS HÍBRIDOS" />
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldHeroOrder">Ordem de Exibição no Slider</label>
          <input type="number" id="cmsFieldHeroOrder" class="checkout-input" value="${existing?.order || 1}" min="1" />
        </div>
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldHeroLead">Texto Descritivo / Lead</label>
        <textarea id="cmsFieldHeroLead" class="checkout-input" rows="3" placeholder="Insira o texto explicativo sobre os fornecedores e logística...">${existing?.lead || ''}</textarea>
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldHeroImage">URL da Imagem de Fundo *</label>
        <input type="text" id="cmsFieldHeroImage" class="checkout-input" value="${existing?.image || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600'}" required />
      </div>
    `;
  } else if (sectionKey === 'banners') {
    title.textContent = existing ? 'Editar Banner da Loja' : 'Novo Banner da Loja';
    sub.textContent = 'Configure o texto, chamada para ação (CTA) e imagem de destaque na página inicial.';
    fieldsContainer.innerHTML = `
      <div class="checkout-form-group">
        <label for="cmsFieldBannerTitle">Título Principal do Banner *</label>
        <input type="text" id="cmsFieldBannerTitle" class="checkout-input" value="${existing?.title || ''}" placeholder="Ex: Importação Direta China–Angola" required />
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldBannerSub">Subtítulo / Descrição de Apoio</label>
        <input type="text" id="cmsFieldBannerSub" class="checkout-input" value="${existing?.subtitle || ''}" placeholder="Ex: Cotação em Kwanzas e entrega porta a porta" />
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldBannerBadge">Selo / Destaque</label>
          <input type="text" id="cmsFieldBannerBadge" class="checkout-input" value="${existing?.badge || 'Destaque Oficial'}" />
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldBannerLoc">Localização na Plataforma</label>
          <select id="cmsFieldBannerLoc" class="checkout-select">
            <option value="Hero Principal (index.html)" ${existing?.location?.includes('Hero') ? 'selected' : ''}>Hero Principal (index.html)</option>
            <option value="Faixa Intermediária" ${existing?.location?.includes('Faixa') ? 'selected' : ''}>Faixa Intermediária Promocional</option>
            <option value="Topo do Catálogo" ${existing?.location?.includes('Catálogo') ? 'selected' : ''}>Topo do Catálogo</option>
          </select>
        </div>
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldBannerCta">Texto do Botão CTA</label>
          <input type="text" id="cmsFieldBannerCta" class="checkout-input" value="${existing?.ctaText || 'Explorar Catálogo'}" />
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldBannerLink">Destino do Botão (Link)</label>
          <input type="text" id="cmsFieldBannerLink" class="checkout-input" value="${existing?.ctaLink || 'catalogo.html'}" />
        </div>
      </div>
    `;
  } else if (sectionKey === 'promotions') {
    title.textContent = existing ? 'Editar Campanha Promocional' : 'Nova Campanha Promocional';
    sub.textContent = 'Crie descontos em percentagem ou Kwanzas e códigos de cupão aplicáveis.';
    fieldsContainer.innerHTML = `
      <div class="checkout-form-group">
        <label for="cmsFieldPromoTitle">Nome da Campanha Promocional *</label>
        <input type="text" id="cmsFieldPromoTitle" class="checkout-input" value="${existing?.title || ''}" placeholder="Ex: Desconto de Primavera em Painéis Solares" required />
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldPromoCode">Código do Cupão *</label>
          <input type="text" id="cmsFieldPromoCode" class="checkout-input" value="${existing?.code || ''}" placeholder="Ex: SOLAR2026" required />
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldPromoDiscount">Valor do Desconto *</label>
          <input type="text" id="cmsFieldPromoDiscount" class="checkout-input" value="${existing?.discount || ''}" placeholder="Ex: 10% OFF ou 200.000 Kz" required />
        </div>
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldPromoCat">Categoria Comercial</label>
          <input type="text" id="cmsFieldPromoCat" class="checkout-input" value="${existing?.category || 'Geral'}" />
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldPromoDate">Data Limite de Validade</label>
          <input type="date" id="cmsFieldPromoDate" class="checkout-input" value="${existing?.validUntil || '2026-12-31'}" />
        </div>
      </div>
    `;
  } else if (sectionKey === 'news') {
    title.textContent = existing ? 'Editar Notícia / Artigo' : 'Nova Notícia / Artigo';
    sub.textContent = 'Publique informações sobre comércio internacional China–Angola.';
    fieldsContainer.innerHTML = `
      <div class="checkout-form-group">
        <label for="cmsFieldNewsTitle">Título da Notícia *</label>
        <input type="text" id="cmsFieldNewsTitle" class="checkout-input" value="${existing?.title || ''}" placeholder="Ex: Novas rotas marítimas Guangzhou–Luanda" required />
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldNewsCat">Categoria</label>
          <input type="text" id="cmsFieldNewsCat" class="checkout-input" value="${existing?.category || 'Logística Marítima'}" />
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldNewsAuthor">Autor / Departamento</label>
          <input type="text" id="cmsFieldNewsAuthor" class="checkout-input" value="${existing?.author || 'Equipa TradeX'}" />
        </div>
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldNewsSummary">Resumo / Conteúdo da Notícia</label>
        <textarea id="cmsFieldNewsSummary" class="checkout-input" rows="3" placeholder="Insira o texto informativo da notícia...">${existing?.summary || ''}</textarea>
      </div>
    `;
  } else if (sectionKey === 'faqs') {
    title.textContent = existing ? 'Editar Pergunta Frequente' : 'Nova Pergunta Frequente (FAQ)';
    sub.textContent = 'Esclareça dúvidas comuns sobre pagamentos, prazos e entregas.';
    fieldsContainer.innerHTML = `
      <div class="checkout-form-group">
        <label for="cmsFieldFaqQuestion">Pergunta Frequente *</label>
        <input type="text" id="cmsFieldFaqQuestion" class="checkout-input" value="${existing?.question || ''}" placeholder="Ex: Como funciona o pagamento via Multicaixa Express?" required />
      </div>
      <div class="checkout-form-row">
        <div class="checkout-form-group">
          <label for="cmsFieldFaqCat">Categoria</label>
          <select id="cmsFieldFaqCat" class="checkout-select">
            <option value="Pagamentos" ${existing?.category === 'Pagamentos' ? 'selected' : ''}>Pagamentos & Kwanzas</option>
            <option value="Logística & Prazos" ${existing?.category === 'Logística & Prazos' ? 'selected' : ''}>Logística & Prazos</option>
            <option value="Entregas" ${existing?.category === 'Entregas' ? 'selected' : ''}>Entregas</option>
            <option value="Garantias" ${existing?.category === 'Garantias' ? 'selected' : ''}>Garantias & Devoluções</option>
          </select>
        </div>
        <div class="checkout-form-group">
          <label for="cmsFieldFaqOrder">Ordem de Exibição</label>
          <input type="number" id="cmsFieldFaqOrder" class="checkout-input" value="${existing?.order || 1}" min="1" />
        </div>
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldFaqAnswer">Resposta Completa e Explicativa *</label>
        <textarea id="cmsFieldFaqAnswer" class="checkout-input" rows="3" placeholder="Insira a resposta detalhada para o cliente..." required>${existing?.answer || ''}</textarea>
      </div>
    `;
  } else if (sectionKey === 'pages') {
    title.textContent = 'Editar Página Institucional';
    sub.textContent = 'Modifique o texto oficial de termos de serviço, políticas e contactos.';
    fieldsContainer.innerHTML = `
      <div class="checkout-form-group">
        <label for="cmsFieldPageTitle">Nome da Página *</label>
        <input type="text" id="cmsFieldPageTitle" class="checkout-input" value="${existing?.title || ''}" required />
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldPageSlug">Slug URL</label>
        <input type="text" id="cmsFieldPageSlug" class="checkout-input" value="${existing?.slug || ''}" readonly />
      </div>
      <div class="checkout-form-group">
        <label for="cmsFieldPageContent">Conteúdo Institucional</label>
        <textarea id="cmsFieldPageContent" class="checkout-input" rows="4" placeholder="Insira o texto oficial da página...">${existing?.content || 'Texto e termos legais em vigor na plataforma de importação TradeX.'}</textarea>
      </div>
    `;
  }

  modal.classList.add('visible');
}

function saveCmsModalForm() {
  const modal = document.getElementById('cmsModalOverlay');
  const idInput = document.getElementById('cmsItemId');
  const typeInput = document.getElementById('cmsItemType');

  let sectionKey = typeInput?.value || 'banners';
  if (sectionKey === 'catalog-hero') sectionKey = 'catalogHeroSlides';
  const editId = idInput?.value;
  const data = cmsStore.getData();

  if (sectionKey === 'catalogHeroSlides') {
    const titleVal = document.getElementById('cmsFieldHeroTitle')?.value.trim();
    const eyeVal = document.getElementById('cmsFieldHeroEyebrow')?.value.trim();
    const ordVal = parseInt(document.getElementById('cmsFieldHeroOrder')?.value, 10) || 1;
    const leadVal = document.getElementById('cmsFieldHeroLead')?.value.trim();
    const imgVal = document.getElementById('cmsFieldHeroImage')?.value.trim();

    const slideObj = {
      title: titleVal,
      eyebrow: eyeVal,
      order: ordVal,
      lead: leadVal,
      image: imgVal || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600',
      active: true
    };

    if (editId) {
      const idx = data.catalogHeroSlides.findIndex(s => s.id === editId);
      if (idx >= 0) data.catalogHeroSlides[idx] = { ...data.catalogHeroSlides[idx], ...slideObj };
    } else {
      data.catalogHeroSlides.push({ id: `slide-cat-${Date.now()}`, ...slideObj });
    }
  } else if (sectionKey === 'banners') {
    const titleVal = document.getElementById('cmsFieldBannerTitle')?.value.trim();
    const subVal = document.getElementById('cmsFieldBannerSub')?.value.trim();
    const badgeVal = document.getElementById('cmsFieldBannerBadge')?.value.trim();
    const locVal = document.getElementById('cmsFieldBannerLoc')?.value;
    const ctaVal = document.getElementById('cmsFieldBannerCta')?.value.trim();
    const linkVal = document.getElementById('cmsFieldBannerLink')?.value.trim();

    const bannerObj = {
      title: titleVal,
      subtitle: subVal,
      badge: badgeVal,
      location: locVal,
      ctaText: ctaVal,
      ctaLink: linkVal,
      active: true
    };

    if (editId) {
      const idx = data.banners.findIndex(b => b.id === editId);
      if (idx >= 0) data.banners[idx] = { ...data.banners[idx], ...bannerObj };
    } else {
      data.banners.unshift({ id: `banner-${Date.now()}`, ...bannerObj });
    }
  } else if (sectionKey === 'promotions') {
    const titleVal = document.getElementById('cmsFieldPromoTitle')?.value.trim();
    const codeVal = document.getElementById('cmsFieldPromoCode')?.value.trim().toUpperCase();
    const discVal = document.getElementById('cmsFieldPromoDiscount')?.value.trim();
    const catVal = document.getElementById('cmsFieldPromoCat')?.value.trim();
    const dateVal = document.getElementById('cmsFieldPromoDate')?.value;

    const promoObj = {
      title: titleVal,
      code: codeVal,
      discount: discVal,
      category: catVal,
      validUntil: dateVal,
      active: true
    };

    if (editId) {
      const idx = data.promotions.findIndex(p => p.id === editId);
      if (idx >= 0) data.promotions[idx] = { ...data.promotions[idx], ...promoObj };
    } else {
      data.promotions.unshift({ id: `promo-${Date.now()}`, ...promoObj });
    }
  } else if (sectionKey === 'news') {
    const titleVal = document.getElementById('cmsFieldNewsTitle')?.value.trim();
    const catVal = document.getElementById('cmsFieldNewsCat')?.value.trim();
    const authVal = document.getElementById('cmsFieldNewsAuthor')?.value.trim();
    const sumVal = document.getElementById('cmsFieldNewsSummary')?.value.trim();

    const newsObj = {
      title: titleVal,
      category: catVal,
      author: authVal,
      summary: sumVal,
      date: 'Agora mesmo',
      status: 'Publicado'
    };

    if (editId) {
      const idx = data.news.findIndex(n => n.id === editId);
      if (idx >= 0) data.news[idx] = { ...data.news[idx], ...newsObj };
    } else {
      data.news.unshift({ id: `news-${Date.now()}`, ...newsObj });
    }
  } else if (sectionKey === 'faqs') {
    const qVal = document.getElementById('cmsFieldFaqQuestion')?.value.trim();
    const catVal = document.getElementById('cmsFieldFaqCat')?.value;
    const ordVal = parseInt(document.getElementById('cmsFieldFaqOrder')?.value, 10) || 1;
    const aVal = document.getElementById('cmsFieldFaqAnswer')?.value.trim();

    const faqObj = {
      question: qVal,
      category: catVal,
      order: ordVal,
      answer: aVal,
      active: true
    };

    if (editId) {
      const idx = data.faqs.findIndex(f => f.id === editId);
      if (idx >= 0) data.faqs[idx] = { ...data.faqs[idx], ...faqObj };
    } else {
      data.faqs.unshift({ id: `faq-${Date.now()}`, ...faqObj });
    }
  } else if (sectionKey === 'pages') {
    const titleVal = document.getElementById('cmsFieldPageTitle')?.value.trim();
    const contentVal = document.getElementById('cmsFieldPageContent')?.value.trim();

    if (editId) {
      const idx = data.pages.findIndex(p => p.id === editId);
      if (idx >= 0) {
        data.pages[idx].title = titleVal;
        data.pages[idx].content = contentVal;
        data.pages[idx].lastUpdated = 'Hoje';
      }
    }
  }

  cmsStore.saveData(data);
  renderCmsCurrentSubView();
  modal?.classList.remove('visible');
}


// Opções do selector de fornecedor no modal de produto
window.addEventListener('tradex:suppliers-changed', () => {
  const sel = document.getElementById('prodFormSupplier');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Sem fornecedor associado —</option>' +
    supplierStore.list().filter(s => s.active).map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  sel.value = current;
});
