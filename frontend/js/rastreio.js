import { esc } from './esc.js';
import { cartStore, renderCartList } from './cart.js';
import { authStore } from './auth.js';
import { api } from './api.js';
import { renderProofUploader } from './proof-upload.js';
import { openDocViewer } from './doc-viewer.js';

// Última consulta bem-sucedida (para abrir documentos com o mesmo e-mail)
let currentLookup = { code: '', email: '' };
const escapeHtmlText = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Renderização Completa dos Detalhes de Rastreio
function renderShipmentDetails(shipment) {
  const container = document.getElementById('trackingDashboard');
  if (!container) return;

  const modeSvg = shipment.modeType === 'air'
    ? `<svg class="track-mode-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"></path></svg>`
    : `<svg class="track-mode-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"></path><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"></path><path d="M12 10v4"></path><path d="M12 2v3"></path></svg>`;

  container.innerHTML = `
    <!-- Cartão Principal de Status -->
    <div class="track-status-hero">
      <div class="track-status-top">
        <div class="track-status-left">
          <div class="track-live-pill ${shipment.statusClass}">
            <span class="track-pulse-dot"></span>
            <span>${shipment.status}</span>
          </div>
          <span class="track-last-update">${shipment.lastUpdate}</span>
        </div>
        <div class="track-status-right">
          <button type="button" class="btn-copy-code" id="btnCopyTrackingCode" title="Copiar Código">
            <span>${shipment.code}</span>
            <svg class="track-copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="track-route-header">
        <div class="route-city-block">
          <span class="route-city-label">ORIGEM</span>
          <h3 class="route-city-name">${esc(shipment.origin.split(',')[0])}</h3>
          <span class="route-subdetail">${esc(shipment.origin)}</span>
        </div>
        <div class="route-transit-graphic">
          <div class="route-mode-badge">${modeSvg} <span>${shipment.mode.split(' ')[0]}</span></div>
          <div class="route-track-line">
            <div class="route-track-fill"></div>
            <div class="route-track-vehicle">${modeSvg}</div>
          </div>
          <span class="route-progress-num">${shipment.progress}% Percorrido</span>
        </div>
        <div class="route-city-block route-city-dest">
          <span class="route-city-label">DESTINO FINAL</span>
          <h3 class="route-city-name">Luanda, Angola</h3>
          <span class="route-subdetail">${shipment.destination}</span>
        </div>
      </div>
    </div>

    <!-- Barra de Milestones (Etapas da Carga) -->
    <div class="track-milestones-card">
      <h3 class="track-card-title">Etapas da Operação Logística</h3>
      <div class="milestones-track">
        ${shipment.milestones.map((m, idx) => `
          <div class="milestone-item ${m.done ? 'milestone-done' : ''} ${m.active ? 'milestone-active' : ''}">
            <div class="milestone-indicator">
              ${m.done 
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
                : idx + 1}
            </div>
            <span class="milestone-label">${esc(m.label)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Grid de Ficha Técnica da Carga -->
    <div class="track-meta-grid">
      <div class="track-meta-card">
        <span class="meta-card-label">Modalidade de Envio</span>
        <strong class="meta-card-value">${modeSvg} <span>${shipment.mode}</span></strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Local de Entrega</span>
        <strong class="meta-card-value">${shipment.finalDelivery}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Data de Envio</span>
        <strong class="meta-card-value">${shipment.departureDate}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Previsão de Entrega</span>
        <strong class="meta-card-value meta-highlight">${shipment.estimatedArrival}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Volume & Peso Bruto</span>
        <strong class="meta-card-value">${shipment.volumeWeight}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Localização Atual Registada</span>
        <strong class="meta-card-value">${shipment.currentLocation}</strong>
      </div>
    </div>

    <!-- Colunas Principais: Timeline Detalhada + Documentação & Ações -->
    <div class="track-columns-split">
      <!-- Coluna da Timeline Cronológica -->
      <div class="track-column-timeline">
        <div class="track-section-heading">
          <h3 class="track-card-title">Histórico e Pontos de Verificação</h3>
          <span class="track-pill-counter">${shipment.timeline.length} eventos registados</span>
        </div>
        <ul class="track-detailed-timeline">
          ${shipment.timeline.map((ev, i) => `
            <li class="track-event-item ${i === 0 ? 'event-latest' : ''}">
              <div class="event-bullet-col">
                <div class="event-bullet-dot"></div>
                ${i !== shipment.timeline.length - 1 ? '<div class="event-line"></div>' : ''}
              </div>
              <div class="event-content-box">
                <div class="event-header-flex">
                  <span class="event-date-stamp">${ev.date}</span>
                  <span class="event-badge ${esc(ev.badgeClass)}">${esc(ev.badge)}</span>
                </div>
                <h4 class="event-title">${esc(ev.title)}</h4>
                <p class="event-location-text">
                  <svg class="event-pin-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>${esc(ev.location)}</span>
                </p>
                <p class="event-detail-text">${esc(ev.detail)}</p>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Coluna de Documentos e Suporte -->
      <div class="track-column-sidebar">
        <!-- Caixa de Documentos da Encomenda -->
        <div class="track-sidebar-card">
          <h3 class="track-card-title">Documentos da Encomenda</h3>
          <p class="sidebar-subtext">Fatura e comprovativos associados a esta encomenda.</p>
          <div class="doc-list-group">
            ${shipment.documents.length === 0 ? '<p class="sidebar-subtext">Ainda não há documentos disponíveis.</p>' : ''}
            ${shipment.documents.map(doc => `
              <div class="doc-item-row is-clickable" role="button" tabindex="0" data-doc-id="${doc.id}">
                <div class="doc-icon-wrap">
                  <svg class="doc-file-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <div class="doc-info-block">
                  <span class="doc-name">${escapeHtmlText(doc.name)}</span>
                  <span class="doc-code">${new Date(doc.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <span class="doc-status-tag">Ver</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Caixa de Ações Rápidas -->
        <div class="track-sidebar-card card-support-action">
          <h3 class="track-card-title">Precisa de Ajuda ou Agendamento?</h3>
          <p class="sidebar-subtext">Acompanhe a sua carga pelo WhatsApp ou fale com a equipa TradeX responsável pela sua encomenda.</p>
          <div class="support-action-buttons">
            <button type="button" class="btn-sidebar-action btn-print-tracking" id="btnPrintReport">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Imprimir Ficha de Rastreio</span>
            </button>
            <a href="https://wa.me/244900000000?text=Ol%C3%A1%20TradeX,%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20rastreio%20${shipment.code}" target="_blank" rel="noopener noreferrer" class="btn-sidebar-action btn-whatsapp-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <span>Acompanhar no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  container.classList.add('visible');

  // Configurar botão de copiar
  const copyBtn = document.getElementById('btnCopyTrackingCode');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard?.writeText(shipment.code);
    const span = copyBtn.querySelector('span');
    if (span) {
      const original = span.textContent;
      span.textContent = 'Copiado!';
      setTimeout(() => { span.textContent = original; }, 2000);
    }
  });

  // Configurar botão de impressão
  document.getElementById('btnPrintReport')?.addEventListener('click', () => {
    window.print();
  });
}

// Cartão de pagamento: instruções + envio do comprovativo quando ainda falta pagar
async function renderPaymentProofCard(shipment, onDone, knownEmail) {
  const status = shipment.payment?.status;
  const sidebar = document.querySelector('#trackingDashboard .track-column-sidebar');
  if (!sidebar || !status) return;

  const card = document.createElement('div');
  card.className = 'track-sidebar-card tracking-proof-card';

  if (status === 'REVIEW_PENDING') {
    card.innerHTML = `
      <h3 class="track-card-title">Pagamento em validação</h3>
      <p class="sidebar-subtext">Recebemos o seu comprovativo. A tesouraria valida normalmente em até 2 horas úteis.</p>`;
    sidebar.prepend(card);
    return;
  }
  if (status !== 'PENDING' && status !== 'DECLINED') return;

  const isMine = authStore.getOrders().some(o => o.number === shipment.code);
  card.innerHTML = `
    <h3 class="track-card-title">${status === 'DECLINED' ? 'Comprovativo rejeitado' : 'Pagamento pendente'}</h3>
    <p class="sidebar-subtext">Transfira <strong>${cartStore.formatAoa(shipment.payment.totalAoa || 0)}</strong> indicando <strong>${shipment.code}</strong> no descritivo e envie o comprovativo.</p>
    <div class="modal-bank-accounts" data-bank></div>
    <div data-uploader></div>`;
  sidebar.prepend(card);

  const cfg = await api.config.payments();
  const accounts = cfg.ok ? cfg.data.data.bank?.accounts || [] : [];
  card.querySelector('[data-bank]').innerHTML = accounts.map(a => `<p><strong>${esc(a.bank)}:</strong> ${esc(a.iban)}</p>`).join('');

  renderProofUploader(card.querySelector('[data-uploader]'), {
    orderNumber: shipment.code,
    askEmail: !isMine && !knownEmail,
    email: knownEmail,
    rejectionReason: status === 'DECLINED' ? shipment.payment.rejectionReason : null,
    onSuccess: (updated) => {
      if (isMine) authStore.cacheOrder(updated);
      setTimeout(onDone, 900);
    }
  });
}

// Inicialização da Página
function initTrackingPage() {
  const form = document.getElementById('trackingPageForm');
  const input = document.getElementById('trackingCodeInput');

  async function executeSearch(rawCode) {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    if (input) input.value = code;

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('codigo', code);
    window.history.replaceState({}, '', newUrl.toString());

    const dashboard = document.getElementById('trackingDashboard');
    if (dashboard) {
      dashboard.innerHTML = '<p class="tracking-status-message">A consultar a encomenda…</p>';
      dashboard.classList.add('visible');
    }

    // E-mail: campo do formulário, ou o da última compra feita neste browser
    const emailInput = document.getElementById('trackingEmailInput');
    let email = emailInput?.value.trim();
    if (!email) {
      const known = authStore.getOrderById(code);
      if (known?.customer?.email) email = known.customer.email;
    }

    const res = await api.tracking.lookup(code, email);
    if (res.ok) {
      currentLookup = { code: res.data.data.code, email: email || '' };
      renderShipmentDetails(res.data.data);
      bindDocuments(res.data.data);
      renderPaymentProofCard(res.data.data, () => executeSearch(code), email);
    } else if (dashboard) {
      if (!email) emailInput?.focus();
      dashboard.innerHTML = `
        <div class="tracking-status-message">
          <h3>${!email && !authStore.isLoggedIn() ? 'Indique o e-mail da compra' : 'Encomenda não encontrada'}</h3>
          <p>${res.status === 404
            ? (!email && !authStore.isLoggedIn()
                ? 'Por segurança, para consultar uma encomenda sem sessão iniciada indique também o e-mail usado na compra.'
                : 'Confirme o código da encomenda e o e-mail usado na compra.')
            : res.message}</p>
        </div>`;
    }

    dashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Atalhos para as encomendas do cliente com sessão iniciada
  function renderMyOrderChips() {
    const wrap = document.getElementById('trackingMyOrders');
    const group = document.getElementById('trackingMyOrdersChips');
    if (!wrap || !group) return;
    const orders = authStore.getOrders().slice(0, 4);
    wrap.hidden = orders.length === 0;
    group.innerHTML = orders.map(o => `
      <button type="button" class="tracking-quick-chip" data-code="${o.number}">
        <span>${o.number}</span>
        <span class="chip-status-text">${o.statusLabel || ''}</span>
      </button>`).join('');
    group.querySelectorAll('.tracking-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => executeSearch(chip.getAttribute('data-code')));
    });
  }
  renderMyOrderChips();
  window.addEventListener('tradex:orders-changed', renderMyOrderChips);
  window.addEventListener('tradex:auth-changed', renderMyOrderChips);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input) executeSearch(input.value);
  });

  // Verifica se há parâmetro ?codigo= na URL
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('codigo');

  if (codeParam) {
    executeSearch(codeParam);
  }

  // Header sticky past-hero
  const header = document.getElementById('mainHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('past-hero');
      } else {
        header.classList.remove('past-hero');
      }
    }, { passive: true });
  }

  // Drawer do Carrinho
  setupCartDrawer();
  updateCartUi();
  window.addEventListener('tradex:cart-changed', (e) => { if (e.detail?.source === 'server') updateCartUi(); });
}

function updateCartUi() {
  const items = cartStore.getItems();
  const countEl = document.getElementById('cartCount');
  const listEl = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalAoa');

  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce((acc, item) => acc + (item.priceAoa * item.quantity), 0);

  if (countEl) countEl.textContent = totalQuantity;
  if (totalEl) totalEl.textContent = cartStore.formatAoa(totalAmount);

  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = `
      <li class="cart-empty-msg">
        O seu pedido está vazio. Selecione itens do catálogo abaixo.
      </li>
    `;
    return;
  }

  renderCartList(listEl, items, updateCartUi);
}

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('visible');
}

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('visible');
}

function setupCartDrawer() {
  document.getElementById('openCartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  document.getElementById('btnSubmitCart')?.addEventListener('click', () => {
    const items = cartStore.getItems();
    if (items.length === 0) {
      alert('Adicione pelo menos um produto ao seu pedido para avançar para o checkout.');
      return;
    }
    window.location.href = 'checkout';
  });
}

document.addEventListener('DOMContentLoaded', initTrackingPage);


function bindDocuments(shipment) {
  const open = (row) => {
    const doc = shipment.documents.find(d => d.id === row.dataset.docId);
    if (!doc) return;
    openDocViewer({
      title: doc.name,
      subtitle: `Encomenda ${shipment.code}`,
      fileName: doc.fileName,
      loadBlob: () => api.tracking.documentBlob(currentLookup.code, doc.id, currentLookup.email)
    });
  };
  document.querySelectorAll('#trackingDashboard .doc-item-row[data-doc-id]').forEach(row => {
    row.addEventListener('click', () => open(row));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(row); } });
  });
}
