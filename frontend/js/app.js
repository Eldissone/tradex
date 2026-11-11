import { api } from './api.js';
import { cartStore } from './cart.js';
import { PRODUCTS_DATA, loadProducts } from './product-store.js';
import { cmsStore, loadCms } from './cms.js';

const PRODUCTS = PRODUCTS_DATA;

let activeCategory = 'all';

// 1. Renderização do Carrossel com View Espelhada & Gestão CMS
function renderCarousel(filterCategory = 'all') {
  const track = document.getElementById('productCarouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  if (!track) return;

  // Atualiza textos da secção a partir do CMS
  const featuredConfig = cmsStore.getFeaturedCatalog();
  const elEyebrow = document.getElementById('featuredCatalogEyebrow');
  const elTitle = document.getElementById('featuredCatalogTitle');
  const elSubtitle = document.getElementById('featuredCatalogSubtitle');

  if (elEyebrow && featuredConfig.eyebrow) elEyebrow.textContent = featuredConfig.eyebrow;
  if (elTitle && featuredConfig.title) elTitle.textContent = featuredConfig.title;
  if (elSubtitle && featuredConfig.subtitle) elSubtitle.textContent = featuredConfig.subtitle;

  // Filtra produtos marcados no CMS para exibição em destaque
  const featuredIds = featuredConfig.productIds || [];
  let sourceProducts = PRODUCTS.filter(p => featuredIds.includes(p.id));
  if (sourceProducts.length === 0) {
    sourceProducts = PRODUCTS; // fallback caso nenhum esteja marcado
  }

  const filtered = filterCategory === 'all' 
    ? sourceProducts 
    : sourceProducts.filter(p => p.category === filterCategory);

  if (filtered.length === 0) {
    track.innerHTML = `
      <div class="catalog-empty-state">
        <h3 class="catalog-empty-title">Nenhum produto nesta categoria</h3>
        <p class="catalog-empty-desc">Explore outras categorias ou veja o catálogo completo.</p>
      </div>
    `;
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  track.innerHTML = filtered.map(p => `
    <article class="carousel-card" data-id="${p.id}">
      <div>
        <div class="carousel-card-banner">
          <span class="carousel-badge">${p.badge}</span>
          <span class="carousel-origin">${p.origin}</span>
        </div>

        <a href="produto.html?id=${p.id}" class="nav-link">
          <div class="product-mirror-box">
            <div class="product-mirror-sheen"></div>
            <img src="${p.image}" alt="${p.title}" class="product-mirror-img" loading="lazy" />
            <div class="product-mirror-base"></div>
          </div>

          <span class="product-category">${p.category}</span>
          <h3 class="product-title">${p.title}</h3>
          <p class="product-specs">${p.specs}</p>
        </a>
      </div>
      <div class="product-bottom">
        <div class="product-price">
          ${cartStore.formatAoa(p.priceAoa)}
          <small>por ${p.unit}</small>
        </div>
        <button type="button" class="btn-add-item" data-add="${p.id}">
          + Adicionar
        </button>
      </div>
    </article>
  `).join('');

  track.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.getAttribute('data-add');
      const prod = PRODUCTS.find(p => p.id === prodId);
      if (prod) {
        cartStore.addItem(prod);
        updateCartUi();
        openCart();
      }
    });
  });

  setupCarouselPagination(filtered.length);
  updateCarouselControls();
}

function setupCarouselControls() {
  const track = document.getElementById('productCarouselTrack');
  const prevBtn = document.getElementById('carouselPrevBtn');
  const nextBtn = document.getElementById('carouselNextBtn');

  if (!track || !prevBtn || !nextBtn) return;

  function getScrollStep() {
    const firstCard = track.querySelector('.carousel-card');
    if (!firstCard) return track.clientWidth * 0.75;
    return firstCard.offsetWidth + 24;
  }

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
  });

  track.addEventListener('scroll', () => {
    updateCarouselControls();
    updateActiveDot();
  });
}

function updateCarouselControls() {
  const track = document.getElementById('productCarouselTrack');
  const prevBtn = document.getElementById('carouselPrevBtn');
  const nextBtn = document.getElementById('carouselNextBtn');

  if (!track || !prevBtn || !nextBtn) return;

  const isAtStart = track.scrollLeft <= 5;
  const isAtEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;

  prevBtn.disabled = isAtStart;
  nextBtn.disabled = isAtEnd;
}

function setupCarouselPagination(itemCount) {
  const dotsContainer = document.getElementById('carouselDots');
  if (!dotsContainer) return;

  dotsContainer.innerHTML = '';
  for (let i = 0; i < itemCount; i++) {
    const dot = document.createElement('button');
    dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Ir para slide ${i + 1}`);
    dot.addEventListener('click', () => {
      const track = document.getElementById('productCarouselTrack');
      const cards = track?.querySelectorAll('.carousel-card');
      if (cards && cards[i]) {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    });
    dotsContainer.appendChild(dot);
  }
}

function updateActiveDot() {
  const track = document.getElementById('productCarouselTrack');
  const cards = track?.querySelectorAll('.carousel-card');
  const dots = document.querySelectorAll('.carousel-dot');

  if (!track || !cards || dots.length === 0) return;

  const scrollLeft = track.scrollLeft;
  let activeIndex = 0;

  cards.forEach((card, idx) => {
    if (card.offsetLeft - track.offsetLeft <= scrollLeft + 50) {
      activeIndex = idx;
    }
  });

  dots.forEach((dot, idx) => {
    if (idx === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// 2. Filtros de Categoria
function setupCategoryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category') || 'all';
      renderCarousel(activeCategory);
      const track = document.getElementById('productCarouselTrack');
      if (track) track.scrollLeft = 0;
    });
  });
}

// 3. Gestão do Carrinho Compartilhada
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

  listEl.innerHTML = items.map((item, index) => `
    <li class="cart-item">
      <div>
        <h5>${item.title}</h5>
        <p>${item.quantity}x ${cartStore.formatAoa(item.priceAoa)}</p>
      </div>
      <div class="cart-item-right">
        <strong>${cartStore.formatAoa(item.priceAoa * item.quantity)}</strong><br>
        <button type="button" class="btn-cart-remove" data-remove="${index}">
          Remover
        </button>
      </div>
    </li>
  `).join('');

  listEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove'), 10);
      cartStore.removeItem(idx);
      updateCartUi();
    });
  });
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
    window.location.href = 'checkout.html';
  });
}

// 4. Simulador Logístico China ➔ Angola
function setupCalculator() {
  const modeSelect = document.getElementById('transportMode');
  const volumeInput = document.getElementById('cargoVolume');
  const weightInput = document.getElementById('cargoWeight');
  const valueInput = document.getElementById('cargoValue');
  const btnCalculate = document.getElementById('btnCalculate');

  const valMercadoriaAoa = document.getElementById('valMercadoriaAoa');
  const valFreteAoa = document.getElementById('valFreteAoa');
  const valSeguroAoa = document.getElementById('valSeguroAoa');
  const valDespachoAoa = document.getElementById('valDespachoAoa');
  const valTotalAoa = document.getElementById('valTotalAoa');

  const USD_TO_AOA = 950;

  function calculate() {
    if (!modeSelect) return;
    const mode = modeSelect.value;
    const volume = parseFloat(volumeInput?.value) || 0;
    const weight = parseFloat(weightInput?.value) || 0;
    const cargoUsd = parseFloat(valueInput?.value) || 0;

    const baseMercadoriaAoa = cargoUsd * USD_TO_AOA;
    let freightUsd = 0;

    if (mode === 'sea_lcl') {
      const chargeableVolume = Math.max(volume, weight / 500);
      freightUsd = chargeableVolume * 190;
    } else if (mode === 'sea_fcl') {
      freightUsd = 3200;
    } else if (mode === 'air_exp') {
      freightUsd = Math.max(weight, volume * 167) * 14.5;
    }

    const freteAoa = freightUsd * USD_TO_AOA;
    const seguroAoa = (baseMercadoriaAoa + freteAoa) * 0.02;
    const taxasDespachoAoa = (baseMercadoriaAoa * 0.14) + 120000;
    const totalGeral = baseMercadoriaAoa + freteAoa + seguroAoa + taxasDespachoAoa;

    if (valMercadoriaAoa) valMercadoriaAoa.textContent = cartStore.formatAoa(baseMercadoriaAoa);
    if (valFreteAoa) valFreteAoa.textContent = cartStore.formatAoa(freteAoa);
    if (valSeguroAoa) valSeguroAoa.textContent = cartStore.formatAoa(seguroAoa);
    if (valDespachoAoa) valDespachoAoa.textContent = cartStore.formatAoa(taxasDespachoAoa);
    if (valTotalAoa) valTotalAoa.textContent = cartStore.formatAoa(totalGeral);
  }

  btnCalculate?.addEventListener('click', calculate);
  modeSelect?.addEventListener('change', calculate);
  volumeInput?.addEventListener('input', calculate);
  weightInput?.addEventListener('input', calculate);
  valueInput?.addEventListener('input', calculate);

  calculate();
}

// 5. Rastreio de Carga
function setupTracking() {
  const form = document.getElementById('trackingForm');
  const input = document.getElementById('trackingCodeInput');

  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    window.location.href = `rastreio.html?codigo=${encodeURIComponent(code)}`;
  });
}

function setupSourcingForm() {
  const form = document.getElementById('sourcingForm');
  const successMsg = document.getElementById('sourcingSuccessMsg');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (successMsg) {
      successMsg.classList.add('visible');
      form.reset();
      setTimeout(() => {
        successMsg.classList.remove('visible');
      }, 7000);
    }
  });
}

// 6. Gestão Dinâmica do Accordion de Perguntas Frequentes (FAQ)
function renderFaqSection() {
  const container = document.getElementById('faqAccordionContainer');
  if (!container) return;

  const faqs = (cmsStore.getData().faqs || [])
    .filter(f => f.active)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (faqs.length === 0) {
    container.innerHTML = '<p class="faq-empty">Perguntas frequentes em atualização.</p>';
    return;
  }

  // Destaca por padrão o item sobre Pagamento por Referência (ou 3º item) como no design de referência
  const defaultIdx = faqs.findIndex(f => f.question.toLowerCase().includes('referência'));
  const initialOpenIndex = defaultIdx !== -1 ? defaultIdx : (faqs.length > 2 ? 2 : 0);

  container.innerHTML = faqs.map((faq, idx) => `
    <div class="faq-item ${idx === initialOpenIndex ? 'open' : ''}">
      <button type="button" class="faq-question" aria-expanded="${idx === initialOpenIndex ? 'true' : 'false'}">
        <span class="faq-question-title">${faq.question}</span>
        <span class="faq-action-icon" aria-hidden="true">
          <svg class="faq-icon-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <svg class="faq-icon-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      <div class="faq-answer">
        <p>${faq.answer}</p>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentItem = btn.closest('.faq-item');
      if (!parentItem) return;

      const isOpen = parentItem.classList.contains('open');
      container.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('open');
        item.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        parentItem.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function setupHeaderScroll() {
  const header = document.getElementById('mainHeader');
  const hero = document.getElementById('inicio');
  if (!header || !hero) return;

  function onScroll() {
    const threshold = hero.offsetHeight - header.offsetHeight;
    if (window.scrollY > threshold) {
      header.classList.add('past-hero');
    } else {
      header.classList.remove('past-hero');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderScroll();
  renderCarousel();
  setupCarouselControls();
  setupCategoryFilters();
  setupCartDrawer();
  updateCartUi();
  window.addEventListener('tradex:cart-changed', (e) => { if (e.detail?.source === 'server') updateCartUi(); });
  setupCalculator();
  setupTracking();
  setupSourcingForm();
  renderFaqSection();

  window.addEventListener('tradex:products-changed', () => renderCarousel(activeCategory));
  loadProducts();
  loadCms();

  window.addEventListener('tradex:cms-changed', () => {
    renderCarousel(activeCategory);
    renderFaqSection();
  });

  void api.health();
});
