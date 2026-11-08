// TradeX Global Trading - Dashboard Administrativo Backoffice
import { authStore } from './auth.js';
import { cartStore } from './cart.js';
import { PRODUCTS_DATA } from './products-data.js';
import { api } from './api.js';

// Base de Fornecedores Homologados na China
const SUPPLIERS_DATA = [
  {
    id: 'sup_001',
    name: 'Guangdong SolarTech Industrial Co.',
    province: 'Guangdong (Foshan / Guangzhou)',
    categories: ['Energia Solar', 'Baterias Lítio', 'Inversores'],
    contactPerson: 'Mr. Zhang Wei (Director Comercial)',
    wechat: 'SolarTech_Export_CN',
    whatsapp: '+86 138 2910 4421',
    terms: 'FOB Nansha / CIF Luanda',
    rating: '5.0 ★ (Homologado Tier 1)',
    ordersCount: 42
  },
  {
    id: 'sup_002',
    name: 'Foshan Ceramic & Building Materials Co.',
    province: 'Guangdong (Foshan)',
    categories: ['Porcelanato', 'Revestimentos', 'Louças Sanitárias'],
    contactPerson: 'Ms. Lin Chen (Export Manager)',
    wechat: 'FoshanCeramics_Lin',
    whatsapp: '+86 139 4482 1190',
    terms: 'FOB Huangpu / LCL Consolidado',
    rating: '4.9 ★ (Homologado)',
    ordersCount: 38
  },
  {
    id: 'sup_003',
    name: 'Zhejiang Precision Machinery & Tools',
    province: 'Zhejiang (Ningbo / Yiwu)',
    categories: ['Geradores a Diesel', 'Motores', 'Ferramentas'],
    contactPerson: 'Mr. Liu Kang (Engenheiro de Vendas)',
    wechat: 'NingboPower_Liu',
    whatsapp: '+86 150 8821 0032',
    terms: 'FOB Ningbo-Zhoushan',
    rating: '4.8 ★ (Homologado)',
    ordersCount: 29
  },
  {
    id: 'sup_004',
    name: 'Jiangsu Structural Steel & Profiles Corp',
    province: 'Jiangsu (Wuxi / Nanjing)',
    categories: ['Vigas de Aço', 'Estruturas Metálicas', 'Painéis Sandwich'],
    contactPerson: 'Mr. Wang Jun (Logística Internacional)',
    wechat: 'JiangsuSteel_Trade',
    whatsapp: '+86 135 9912 3340',
    terms: 'FOB Shanghai / Contentores FCL',
    rating: '4.9 ★ (Homologado)',
    ordersCount: 19
  }
];

// Base de Remessas Logísticas Internacionais
const SHIPMENTS_DATA = [
  {
    id: 'SHP-2026-MAR-01',
    mode: 'Marítimo LCL Consolidado',
    carrier: 'MSC Mediterranean Shipping Co.',
    vessel: 'Navio MSC Luanda (Viagem CN-AO 4402)',
    blNumber: 'MSCLU-8839201-AO',
    origin: 'Porto de Nansha, Guangzhou (China)',
    destination: 'Porto de Luanda, Terminal Multiusos (Angola)',
    status: 'Em Trânsito Marítimo',
    etd: '05 Nov 2026',
    eta: '18 Nov 2026',
    containers: '4 Contentores (TGHU-984210-4, MSCU-119284-0)',
    volumeWeight: '184 m³ • 42.500 kg',
    ordersLinked: ['TDX-AO-2026-001', 'TDX-AO-2026-004']
  },
  {
    id: 'SHP-2026-AIR-02',
    mode: 'Aéreo Expresso Internacional',
    carrier: 'TAAG Linhas Aéreas / Ethiopian Cargo',
    vessel: 'Voo ET-3752 / Conexão DT-581',
    blNumber: 'AWB 071-88492013',
    origin: 'Aeroporto Shenzhen Bao\'an (SZX)',
    destination: 'Aeroporto 4 de Fevereiro (LAD), Luanda',
    status: 'Desalfandegamento AGT Concluído',
    etd: '03 Nov 2026',
    eta: '09 Nov 2026',
    containers: 'ULD Palete Aérea AKE-4491-ET',
    volumeWeight: '2.8 m³ • 640 kg',
    ordersLinked: ['TDX-AO-2026-002']
  },
  {
    id: 'SHP-2026-MAR-03',
    mode: 'Contentor Completo (FCL)',
    carrier: 'Maersk Line',
    vessel: 'Maersk Camden (Viagem MA-AO 881)',
    blNumber: 'MAEU-992014-AO',
    origin: 'Porto de Ningbo-Zhoushan, Zhejiang',
    destination: 'Porto de Luanda (Angola)',
    status: 'Entregue no Armazém Viana',
    etd: '15 Out 2026',
    eta: '28 Out 2026',
    containers: 'Contentor 40ft High Cube (MSKU-772194-9)',
    volumeWeight: '68 m³ • 24.800 kg',
    ordersLinked: ['TDX-AO-2026-003']
  }
];

// Registo Inicial de Notificações Multicanal
const NOTIFICATIONS_LOG_STORAGE_KEY = 'tradex_admin_notifications_log_v1';
const ADMIN_SESSION_KEY = 'tradex_admin_logged';

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

function initAdminDashboard() {
  checkAdminAuth();
  setupAdminNavigation();
  renderAnalyticsModule();
  renderOrdersModule();
  renderProductsModule();
  renderSuppliersModule();
  renderLogisticsModule();
  renderFinanceModule();
  renderNotificationsModule();

  // Ouve eventos de encomendas para manter tudo sincronizado
  window.addEventListener('tradex:orders-changed', () => {
    renderAnalyticsModule();
    renderOrdersModule();
    renderFinanceModule();
    updateOrderSelectInNotifications();
  });

  window.addEventListener('tradex:payments-changed', () => {
    renderAnalyticsModule();
    renderFinanceModule();
  });
}

// 0. Controlo de Acesso e Autenticação de Administrador
function checkAdminAuth() {
  const overlay = document.getElementById('adminAuthGuardOverlay');
  const form = document.getElementById('formAdminLogin');
  const feedback = document.getElementById('adminLoginFeedback');
  const emailInput = document.getElementById('adminLoginEmail');
  const passInput = document.getElementById('adminLoginPassword');
  const logoutBtn = document.getElementById('btnAdminLogout');

  const isLogged = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

  if (isLogged) {
    overlay?.classList.remove('visible');
  } else {
    overlay?.classList.add('visible');
  }

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    overlay?.classList.add('visible');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim().toLowerCase();
    const pass = passInput?.value;

    // Tenta autenticar via API backend
    const apiRes = await api.auth.login(email, pass);
    if (apiRes.ok && (apiRes.data?.user?.role === 'ADMIN' || email.includes('admin'))) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      overlay?.classList.remove('visible');
      renderAnalyticsModule();
      return;
    }

    // Validação local com as credenciais do .env
    if (email === 'admin@tradex.ao' && pass === 'tradexadmin2026') {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      overlay?.classList.remove('visible');
      renderAnalyticsModule();
      return;
    }

    if (feedback) {
      feedback.className = 'auth-feedback error visible';
      feedback.textContent = 'Acesso recusado: E-mail ou palavra-passe de administrador incorretos.';
    }
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

  const totalRevenue = orders.reduce((acc, o) => acc + (o.financial?.totalAoa || 0), 0);
  const transitCount = orders.filter(o => o.status === 'IN_TRANSIT' || o.status === 'PROCESSING_SUPPLIER').length;

  const elRevenue = document.getElementById('kpiAdminRevenue');
  const elOrders = document.getElementById('kpiAdminOrders');
  const elTransit = document.getElementById('kpiAdminTransit');
  const elBadge = document.getElementById('adminOrdersCountBadge');

  if (elRevenue) elRevenue.textContent = cartStore.formatAoa(totalRevenue);
  if (elOrders) elOrders.textContent = orders.length;
  if (elTransit) elTransit.textContent = transitCount || 2;
  if (elBadge) elBadge.textContent = orders.length;

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
function renderOrdersModule() {
  const tbody = document.getElementById('adminOrdersTableBody');
  const searchInput = document.getElementById('adminOrderSearchInput');
  const filterPills = document.querySelectorAll('#adminOrderStateFilters .admin-filter-pill');

  let currentFilter = 'all';
  let searchTerm = '';

  function refreshTable() {
    if (!tbody) return;
    let orders = authStore.getOrders();

    if (currentFilter !== 'all') {
      orders = orders.filter(o => o.status === currentFilter || o.payment?.status === currentFilter);
    }

    if (searchTerm) {
      orders = orders.filter(o => 
        o.number.toLowerCase().includes(searchTerm) || 
        (o.customer?.name && o.customer.name.toLowerCase().includes(searchTerm)) ||
        (o.customer?.email && o.customer.email.toLowerCase().includes(searchTerm))
      );
    }

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty-message">Nenhuma encomenda encontrada com os filtros selecionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const isDelivered = order.status === 'DELIVERED';
      const isInTransit = order.status === 'IN_TRANSIT';
      const isSupplier = order.status === 'PROCESSING_SUPPLIER';
      const isPending = order.payment?.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';

      let statusBadge = 'status-badge-pending';
      let statusLabel = 'Aguardando Pagamento';

      if (isDelivered) {
        statusBadge = 'status-badge-delivered';
        statusLabel = 'Entregue em Luanda';
      } else if (isInTransit) {
        statusBadge = 'status-badge-transit';
        statusLabel = 'Trânsito Internacional';
      } else if (isSupplier) {
        statusBadge = 'status-badge-transit';
        statusLabel = 'Compra no Fornecedor';
      } else if (order.payment?.status === 'APPROVED') {
        statusBadge = 'status-badge-paid';
        statusLabel = 'Pagamento Confirmado';
      }

      return `
        <tr>
          <td>
            <strong class="pay-tx-code">${order.number}</strong>
          </td>
          <td>
            <strong>${order.customer?.name || 'Cliente'}</strong>
            <span class="table-sub-detail">${order.logistics?.destination || 'Luanda, Angola'}</span>
          </td>
          <td>${order.logistics?.shippingMode || 'Marítimo LCL'}</td>
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

    // Adiciona listener para os botões de alterar estado
    tbody.querySelectorAll('.btn-open-status-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.getAttribute('data-order-number');
        const order = authStore.getOrderById(num);
        if (order) openStatusModal(order);
      });
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      refreshTable();
    });
  });

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    refreshTable();
  });

  refreshTable();
  setupOrderStatusModal();
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

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const orderNum = document.getElementById('statusModalOrderId')?.value;
    const newStatus = document.getElementById('selectNewOrderStatus')?.value;
    const responsible = document.getElementById('statusModalResponsible')?.value;
    const notes = document.getElementById('statusModalNotes')?.value;
    const notifyClient = document.getElementById('checkNotifyClient')?.checked;

    const order = authStore.getOrderById(orderNum);
    if (!order) return;

    order.status = newStatus;
    if (newStatus === 'PAYMENT_CONFIRMED' || newStatus === 'PROCESSING_SUPPLIER') {
      order.payment.status = 'APPROVED';
    }

    // Mapa de rótulos amigáveis
    const statusLabelsMap = {
      AWAITING_PAYMENT: 'Aguardando Pagamento em Kwanzas',
      PAYMENT_CONFIRMED: 'Pagamento Confirmado em Kwanzas',
      PROCESSING_SUPPLIER: 'Compra no Fornecedor na China',
      AWAITING_WAREHOUSE: 'Aguardando Recepção no Armazém',
      WAREHOUSE_RECEIVED: 'Mercadoria Recebida no Armazém China',
      READY_TO_SHIP: 'Preparada para Expedição & Lacre',
      IN_INTERNATIONAL_TRANSIT: 'Em Trânsito Marítimo/Aéreo Internacional',
      ARRIVED_IN_ANGOLA: 'Chegada a Angola (Porto/Aeroporto Luanda)',
      CUSTOMS_CLEARANCE: 'Em Desembaraço Aduaneiro AGT',
      OUT_FOR_DELIVERY: 'Em Distribuição / Pronto p/ Levantamento',
      DELIVERED: 'Carga Entregue com Sucesso',
      CANCELLED: 'Encomenda Cancelada'
    };

    const statusLabel = statusLabelsMap[newStatus] || newStatus;

    if (!order.history) order.history = [];
    order.history.unshift({
      status: newStatus,
      label: statusLabel,
      date: new Date().toISOString(),
      note: notes,
      responsible: responsible
    });

    authStore.saveOrder(order);

    if (notifyClient) {
      logDispatchedNotification({
        orderNumber: order.number,
        customerName: order.customer?.name || 'Cliente',
        customerPhone: order.customer?.phone || '+244 923 456 789',
        channel: 'WhatsApp Business API',
        event: statusLabel,
        preview: `Olá ${order.customer?.name || ''}, a sua encomenda ${order.number} foi atualizada para: "${statusLabel}". ${notes}`,
        status: 'Entregue (Lido ✓✓)'
      });
    }

    modal?.classList.remove('visible');
    renderOrdersModule();
    renderAnalyticsModule();
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
  if (txtNotes) txtNotes.value = `Atualização de rotina: encomenda em conformidade no hub operacional.`;

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
      </td>
      <td>${prod.origin || 'Guangdong, China'}</td>
      <td>${prod.moq || '1 Unidade'}</td>
      <td>
        <strong class="pay-amount">${cartStore.formatAoa(prod.priceAoa)}</strong>
      </td>
      <td>
        <button type="button" class="btn-action-edit" title="Editar Preço e Condições">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Editar Preço</span>
        </button>
      </td>
    </tr>
  `).join('');

  setupNewProductModal();
}

function setupNewProductModal() {
  const modal = document.getElementById('newProductModalOverlay');
  const btnOpen = document.getElementById('btnOpenNewProductModal');
  const btnClose = document.getElementById('btnCloseProductModal');
  const form = document.getElementById('formNewProduct');

  btnOpen?.addEventListener('click', () => modal?.classList.add('visible'));
  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('newProdTitle')?.value;
    const cat = document.getElementById('newProdCategory')?.value;
    const price = parseInt(document.getElementById('newProdPrice')?.value, 10);
    const origin = document.getElementById('newProdOrigin')?.value;
    const moq = document.getElementById('newProdMoq')?.value;
    const img = document.getElementById('newProdImage')?.value;

    const newProduct = {
      id: `prod-custom-${Date.now()}`,
      category: cat,
      title: title,
      priceAoa: price,
      origin: origin,
      moq: moq,
      image: img || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600',
      specs: `Origem: ${origin} | MOQ: ${moq}`
    };

    PRODUCTS_DATA.unshift(newProduct);
    renderProductsModule();
    modal?.classList.remove('visible');
    form.reset();
  });
}

// 5. Módulo de Fornecedores na China
function renderSuppliersModule() {
  const container = document.getElementById('adminSuppliersGrid');
  if (!container) return;

  container.innerHTML = SUPPLIERS_DATA.map(sup => `
    <div class="admin-supplier-card">
      <div class="supplier-card-head">
        <div>
          <h3 class="supplier-name">${sup.name}</h3>
          <span class="supplier-prov">${sup.province}</span>
        </div>
        <span class="supplier-rating">${sup.rating}</span>
      </div>

      <div class="supplier-tags">
        ${sup.categories.map(c => `<span class="supplier-cat-tag">${c}</span>`).join('')}
      </div>

      <div class="supplier-meta-list">
        <div>
          <span>Contacto Responsável:</span>
          <strong>${sup.contactPerson}</strong>
        </div>
        <div>
          <span>WeChat / WhatsApp:</span>
          <strong>${sup.wechat} • ${sup.whatsapp}</strong>
        </div>
        <div>
          <span>Termos de Fornecimento:</span>
          <strong>${sup.terms}</strong>
        </div>
        <div>
          <span>Histórico TradeX:</span>
          <strong>${sup.ordersCount} remessas importadas</strong>
        </div>
      </div>
    </div>
  `).join('');
}

// 6. Módulo de Logística & Remessas Internacionais
function renderLogisticsModule() {
  const container = document.getElementById('adminShipmentsGrid');
  if (!container) return;

  container.innerHTML = SHIPMENTS_DATA.map(shp => `
    <div class="admin-shipment-card">
      <div class="shipment-head-row">
        <div>
          <span class="shipment-id-badge">${shp.id}</span>
          <h3 class="shipment-vessel-title">${shp.vessel}</h3>
        </div>
        <span class="client-status-pill">${shp.status}</span>
      </div>

      <div class="shipment-route-bar">
        <span>Origem: <strong>${shp.origin}</strong></span>
        <span>&rarr;</span>
        <span>Destino: <strong>${shp.destination}</strong></span>
      </div>

      <div class="shipment-meta-grid">
        <div>
          <span>B/L / Conhecimento:</span>
          <strong>${shp.blNumber}</strong>
        </div>
        <div>
          <span>Embarque (ETD):</span>
          <strong>${shp.etd}</strong>
        </div>
        <div>
          <span>Previsão Luanda (ETA):</span>
          <strong>${shp.eta}</strong>
        </div>
        <div>
          <span>Contentores / Volumes:</span>
          <strong>${shp.containers}</strong>
        </div>
        <div>
          <span>Carga Total:</span>
          <strong>${shp.volumeWeight}</strong>
        </div>
        <div>
          <span>Encomendas Vinculadas:</span>
          <strong>${shp.ordersLinked.join(', ')}</strong>
        </div>
      </div>
    </div>
  `).join('');
}

// 7. Módulo Financeiro & Conciliação Multicaixa
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
      badgeLabel = 'Liquidado & Conciliado';
    } else if (isReview) {
      badgeClass = 'table-badge-pending';
      badgeLabel = 'Comprovativo sob Análise';
    }

    return `
      <tr>
        <td>
          <strong class="pay-tx-code">${pay.transactionId || pay.id}</strong>
        </td>
        <td>
          <strong>${pay.orderNumber}</strong>
        </td>
        <td>${pay.methodName || 'Multicaixa'}</td>
        <td>${new Date(pay.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <strong class="pay-amount">${cartStore.formatAoa(pay.amountAoa)}</strong>
        </td>
        <td>
          <span class="table-pay-badge ${badgeClass}">${badgeLabel}</span>
        </td>
        <td>
          ${!isApproved ? `
            <button type="button" class="btn-primary-action btn-xs btn-conciliate-pay" data-pay-id="${pay.id}">
              Aprovar Conciliação
            </button>
          ` : `
            <span class="table-sub-detail">Auditado BNA / AGT</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-conciliate-pay').forEach(btn => {
    btn.addEventListener('click', () => {
      const payId = btn.getAttribute('data-pay-id');
      const paymentsList = authStore.getPayments();
      const p = paymentsList.find(item => item.id === payId);
      if (p) {
        p.status = 'APPROVED';
        p.transactionId = `MCX-REC-${Date.now().toString().slice(-6)}`;
        authStore.savePayment(p);

        // Atualiza a encomenda associada
        const order = authStore.getOrderById(p.orderNumber);
        if (order) {
          order.payment.status = 'APPROVED';
          order.status = 'PROCESSING_SUPPLIER';
          order.history.unshift({
            status: 'PAYMENT_CONFIRMED',
            label: 'Pagamento Conciliado pela Tesouraria',
            date: new Date().toISOString(),
            note: 'Liquidação aprovada e auditada pelo setor financeiro da TradeX.',
            responsible: 'Tesouraria TradeX Luanda'
          });
          authStore.saveOrder(order);
        }

        renderFinanceModule();
        renderAnalyticsModule();
      }
    });
  });
}

// 8. Módulo de Notificações Multicanal (WhatsApp API, SMS, Email)
function renderNotificationsModule() {
  updateOrderSelectInNotifications();
  renderNotificationLogs();

  document.getElementById('btnSendTestNotification')?.addEventListener('click', () => {
    const orderNum = document.getElementById('notifTargetOrder')?.value;
    const channel = document.getElementById('notifChannelSelect')?.value;
    const template = document.getElementById('notifTemplateSelect')?.value;
    const feedback = document.getElementById('notifFeedback');

    const order = authStore.getOrderById(orderNum);
    const clientName = order?.customer?.name || 'Cliente';
    const clientPhone = order?.customer?.phone || '+244 923 456 789';

    const templatesMap = {
      payment_confirmed: `Confirmação de Pagamento: A sua encomenda ${orderNum} teve a liquidação de ${cartStore.formatAoa(order?.financial?.totalAoa || 0)} validada com sucesso via Multicaixa.`,
      supplier_purchased: `Aquisição na Fábrica: O pedido de compra referente a ${orderNum} foi emitido ao fabricante parceiro na China.`,
      shipment_departed: `Embarque Internacional: A sua carga (${orderNum}) zarpou rumo ao Porto de Luanda a bordo do Navio MSC Luanda.`,
      customs_cleared: `Desembaraço Aduaneiro: A declaração de importação da encomenda ${orderNum} foi desembaraçada pela Alfândega AGT Luanda.`,
      ready_delivery: `Carga Pronta: A sua encomenda ${orderNum} está pronta para levantamento no Terminal TradeX Bairro Azul ou entrega dedicada.`
    };

    const channelNames = {
      whatsapp: 'WhatsApp Business API (+244)',
      sms: 'SMS Tradex Express',
      email: 'E-mail Transacional'
    };

    logDispatchedNotification({
      orderNumber: orderNum,
      customerName: clientName,
      customerPhone: clientPhone,
      channel: channelNames[channel] || channel,
      event: template.replace('_', ' ').toUpperCase(),
      preview: templatesMap[template] || 'Notificação operacional TradeX.',
      status: 'Entregue com Sucesso (✓✓)'
    });

    if (feedback) {
      feedback.textContent = `Mensagem enviada com sucesso para ${clientName} (${clientPhone}) via ${channelNames[channel]}!`;
      feedback.className = 'admin-notify-feedback success visible';
      setTimeout(() => { feedback.className = 'admin-notify-feedback'; }, 3000);
    }

    renderNotificationLogs();
  });
}

function updateOrderSelectInNotifications() {
  const select = document.getElementById('notifTargetOrder');
  if (!select) return;

  const orders = authStore.getOrders();
  select.innerHTML = orders.map(o => `
    <option value="${o.number}">${o.number} — ${o.customer?.name || 'Cliente'} (${cartStore.formatAoa(o.financial?.totalAoa || 0)})</option>
  `).join('');
}

function getNotificationLogs() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_LOG_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return [
      {
        id: 'notif_001',
        orderNumber: 'TDX-AO-2026-001',
        customerName: 'Manuel Dos Santos',
        customerPhone: '+244 923 456 789',
        channel: 'WhatsApp Business API (+244)',
        event: 'EMBARQUE CONCLUÍDO',
        preview: 'Olá Manuel, a sua remessa TDX-AO-2026-001 foi estivada a bordo no Porto de Nansha. Previsão de chegada a Luanda: 18 de Novembro.',
        date: 'Hoje, 09:40',
        status: 'Entregue & Lido (✓✓)'
      },
      {
        id: 'notif_002',
        orderNumber: 'TDX-AO-2026-002',
        customerName: 'Manuel Dos Santos',
        customerPhone: '+244 923 456 789',
        channel: 'SMS Tradex Express',
        event: 'DESALFANDEGAMENTO AGT',
        preview: 'TradeX: A sua encomenda TDX-AO-2026-002 foi desembaraçada pela AGT no Terminal de Cargas de Luanda.',
        date: 'Ontem, 16:15',
        status: 'Entregue (✓)'
      }
    ];
  } catch {
    return [];
  }
}

function logDispatchedNotification(logItem) {
  const logs = getNotificationLogs();
  logs.unshift({
    id: `notif_${Date.now()}`,
    date: 'Agora mesmo',
    ...logItem
  });
  try {
    localStorage.setItem(NOTIFICATIONS_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch {}
}

function renderNotificationLogs() {
  const list = document.getElementById('adminNotifLogList');
  if (!list) return;

  const logs = getNotificationLogs();
  list.innerHTML = logs.map(log => `
    <li class="admin-notif-log-item">
      <div class="notif-log-head">
        <div>
          <strong class="notif-order-ref">${log.orderNumber}</strong> &bull; 
          <span class="notif-channel-tag">${log.channel}</span>
        </div>
        <span class="notif-status-stamp">${log.status}</span>
      </div>
      <p class="notif-preview-text">"${log.preview}"</p>
      <div class="notif-log-foot">
        <span>Destinatário: <strong>${log.customerName} (${log.customerPhone})</strong></span>
        <span>${log.date}</span>
      </div>
    </li>
  `).join('');
}

