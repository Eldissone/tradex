// TradeX Global Trading - Dashboard Administrativo Backoffice
import { authStore } from './auth.js';
import { cartStore } from './cart.js';
import { PRODUCTS_DATA } from './products-data.js';
import { api } from './api.js';
import { cmsStore } from './cms.js';

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
  renderCmsModule();

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
        <button type="button" class="btn-action-edit btn-edit-product" data-product-id="${prod.id}" title="Editar Todos os Dados do Produto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Editar Produto</span>
        </button>
      </td>
    </tr>
  `).join('');

  setupProductModal();
}

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
  document.querySelectorAll('.btn-edit-product').forEach(btn => {
    btn.addEventListener('click', () => {
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
    });
  });

  btnClose?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  // Submissão do formulário (Criação ou Edição com fotos dinâmicas)
  form?.addEventListener('submit', (e) => {
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
        transitTimeSea: inpTransit?.value.trim() || '32 a 38 dias',
        packing: inpPacking?.value.trim() || 'Palete reforçada com filme retrátil'
      }
    };

    if (prodId) {
      // EDITAR produto existente
      const idx = PRODUCTS_DATA.findIndex(p => p.id === prodId);
      if (idx >= 0) {
        PRODUCTS_DATA[idx] = { ...PRODUCTS_DATA[idx], ...updatedData };
      }
    } else {
      // CRIAR novo produto
      const newProd = {
        id: `prod-custom-${Date.now()}`,
        ...updatedData
      };
      PRODUCTS_DATA.unshift(newProd);
    }

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

// ==========================================================================
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
        <input type="text" id="cmsFieldBannerSub" class="checkout-input" value="${existing?.subtitle || ''}" placeholder="Ex: Cotação em Kwanzas e desembaraço aduaneiro completo" />
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
    sub.textContent = 'Esclareça dúvidas comuns sobre pagamentos Multicaixa, prazos e alfândega.';
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
            <option value="Alfândega" ${existing?.category === 'Alfândega' ? 'selected' : ''}>Alfândega & AGT</option>
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

