import { api } from './api.js';
import { cartStore } from './cart.js';

// Catálogo em destaque para o Carrossel (China ➔ Angola)
const PRODUCTS = [
  {
    id: 'prod-01',
    category: 'solar',
    title: 'Kit Painéis Solares Monocristalinos 550W (Palete 30 un.)',
    origin: 'Foshan, Guangdong',
    badge: 'Tier 1 Fabrico',
    specs: 'Eficiência 21.3% | Células PERC | Vidro temperado antirreflexo | Garantia 12 anos',
    priceAoa: 3450000,
    unit: 'palete'
  },
  {
    id: 'prod-02',
    category: 'solar',
    title: 'Inversor Solar Híbrido 5.5kW 48V Pure Sine Wave',
    origin: 'Shenzhen, Guangdong',
    badge: 'Mais Vendido',
    specs: 'Compatível com Baterias Lítio & Gel | MPPT 100A integrado | Monitorização Wi-Fi',
    priceAoa: 820000,
    unit: 'unidade'
  },
  {
    id: 'prod-03',
    category: 'industrial',
    title: 'Mini Betoneira Elétrica 350L Motor Cobre 220V',
    origin: 'Guangzhou, Guangdong',
    badge: 'Alta Resistência',
    specs: 'Tambor reforçado 3mm | Rodas de ferro fundido | Capacidade mistura 260L',
    priceAoa: 680000,
    unit: 'unidade'
  },
  {
    id: 'prod-04',
    category: 'industrial',
    title: 'Conjunto de Andaimes Modulares Galvanizados (100 m²)',
    origin: 'Tianjin',
    badge: 'Segurança Q235',
    specs: 'Aço carbono galvanizado a quente | Travessas diagonais e pranchas antiderrapantes',
    priceAoa: 1950000,
    unit: 'conjunto'
  },
  {
    id: 'prod-05',
    category: 'electronics',
    title: 'Campânula LED Industrial High Bay 200W (Caixa 10 un.)',
    origin: 'Zhongshan, Guangdong',
    badge: 'IP65 Industrial',
    specs: 'Luminosidade 26.000 lm | Luz Fria 6500K | Driver Meanwell de alta eficiência',
    priceAoa: 490000,
    unit: 'caixa'
  },
  {
    id: 'prod-06',
    category: 'electronics',
    title: 'Refletores Solares LED 300W com Painel (Lote 20 un.)',
    origin: 'Zhongshan, Guangdong',
    badge: 'Autonomia 14h',
    specs: 'Bateria LiFePO4 de longa duração | Sensor crepuscular com controlo remoto',
    priceAoa: 560000,
    unit: 'lote'
  },
  {
    id: 'prod-10',
    category: 'industrial',
    title: 'Conjunto Gerador Diesel Silencioso 15kVA Trifásico',
    origin: 'Wuxi, Jiangsu',
    badge: 'Insonorizado 68dB',
    specs: 'Motor diesel 4 cilindros com arranque automático ATS | Cabine insonorizada',
    priceAoa: 3200000,
    unit: 'unidade'
  },
  {
    id: 'prod-11',
    category: 'industrial',
    title: 'Mini Trator Agrícola 25HP 4x4 com Freza e Arado',
    origin: 'Weifang, Shandong',
    badge: 'Maquinaria Direta',
    specs: 'Motor diesel monocilíndrico de alta compressão | Tração 4x4 e tomada de força PTO',
    priceAoa: 4800000,
    unit: 'unidade'
  }
];

let activeCategory = 'all';

// 1. Renderização e Controlo do Banner Carrossel
function renderCarousel(filterCategory = 'all') {
  const track = document.getElementById('productCarouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  if (!track) return;

  const filtered = filterCategory === 'all' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === filterCategory);

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
        <span class="product-category">${p.category}</span>
        <h3 class="product-title">${p.title}</h3>
        <p class="product-specs">${p.specs}</p>
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

  // Event Listeners dos botões de adicionar ao pedido
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

  // Atualiza botões e indicadores (dots)
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
    return firstCard.offsetWidth + 24; // Largura do cartão + gap
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
  // Um indicador por item ou grupos de itens
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

// 2. Filtros de Categoria do Carrossel
function setupCategoryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category') || 'all';
      renderCarousel(activeCategory);
      // Resetar scroll para o início
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
      alert('Adicione pelo menos um produto ao seu pedido para gerar cotação.');
      return;
    }
    const totalAmount = items.reduce((acc, item) => acc + (item.priceAoa * item.quantity), 0);
    const summary = items.map(i => `• ${i.quantity}x ${i.title} (${cartStore.formatAoa(i.priceAoa * i.quantity)})`).join('\n');
    
    alert(`Pedido TradeX preparado!\n\nItens:\n${summary}\n\nTotal Previsto: ${cartStore.formatAoa(totalAmount)}\n\nEntraremos em contacto para emissão da Fatura Pró-forma em AOA.`);
    closeCart();
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
  const details = document.getElementById('trackingDetails');
  const metaCode = document.getElementById('trackMetaCode');
  const timeline = document.getElementById('trackingTimeline');

  if (!form || !input || !details) return;

  const DEMO_EVENTS = [
    { title: 'Recepção no Armazém TradeX', loc: 'Guangzhou Hub, China', date: '02 Nov 2026', done: true },
    { title: 'Inspeção de Qualidade e Paletização', loc: 'Guangzhou Hub, China', date: '03 Nov 2026', done: true },
    { title: 'Embarque e Despacho Aduaneiro de Origem', loc: 'Porto de Nansha, Guangzhou', date: '05 Nov 2026', done: true },
    { title: 'Em Trânsito Marítimo Internacional', loc: 'Oceano Índico (Navio MSC Luanda)', date: 'Em curso (Prev. 18 Nov)', active: true },
    { title: 'Atracação e Desalfandegamento em Luanda', loc: 'Porto de Luanda, Angola', date: 'Pendente' },
    { title: 'Disponível para Levantamento no Terminal TradeX', loc: 'Bairro Azul, Luanda', date: 'Pendente' }
  ];

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    if (metaCode) metaCode.textContent = code;
    details.classList.add('visible');

    if (timeline) {
      timeline.innerHTML = DEMO_EVENTS.map(ev => `
        <li class="timeline-step ${ev.done ? 'done' : ''} ${ev.active ? 'active' : ''}">
          <div class="timeline-bullet"></div>
          <div class="timeline-info">
            <h4>${ev.title}</h4>
            <p>${ev.loc} — <strong>${ev.date}</strong></p>
          </div>
        </li>
      `).join('');
    }

    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

document.addEventListener('DOMContentLoaded', () => {
  renderCarousel();
  setupCarouselControls();
  setupCategoryFilters();
  setupCartDrawer();
  updateCartUi();
  setupCalculator();
  setupTracking();
  setupSourcingForm();

  void api.health();
});
