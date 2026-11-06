import { api } from './api.js';

// Catálogo inicial de produtos (Sourcing Direto China ➔ Angola)
const PRODUCTS = [
  {
    id: 'prod-01',
    category: 'solar',
    title: 'Kit Painéis Solares Monocristalinos 550W (Palete com 30 un.)',
    specs: 'Tier 1 Fabrico Foshan | Eficiência 21.3% | Garantia 12 anos',
    priceAoa: 3450000,
    unit: 'palete'
  },
  {
    id: 'prod-02',
    category: 'solar',
    title: 'Inversor Solar Híbrido 5.5kW 48V Pure Sine Wave',
    specs: 'Compatível com Baterias Lítio & Gel | Monitorização Wi-Fi',
    priceAoa: 820000,
    unit: 'unidade'
  },
  {
    id: 'prod-03',
    category: 'industrial',
    title: 'Mini Betoneira Elétrica 350L Motor Cobre',
    specs: 'Tambor reforçado 3mm | Rodas de transporte | 220V/50Hz',
    priceAoa: 680000,
    unit: 'unidade'
  },
  {
    id: 'prod-04',
    category: 'industrial',
    title: 'Conjunto de Andaimes Modulares Galvanizados (100 m²)',
    specs: 'Aço Q235 reforçado | Travessas e pranchas antiderrapantes',
    priceAoa: 1950000,
    unit: 'conjunto'
  },
  {
    id: 'prod-05',
    category: 'electronics',
    title: 'Campânula LED Industrial High Bay 200W (Caixa 10 un.)',
    specs: 'Luminosidade 26.000 lm | Proteção IP65 | Driver Meanwell',
    priceAoa: 490000,
    unit: 'caixa'
  },
  {
    id: 'prod-06',
    category: 'electronics',
    title: 'Refletores Solares LED 300W com Painel & Comando (Lote 20 un.)',
    specs: 'Bateria LiFePO4 de longa duração | Sensor crepuscular',
    priceAoa: 560000,
    unit: 'lote'
  }
];

// Estado do Carrinho / Pedido
let cart = [];

function formatAoa(value) {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0
  }).format(value).replace('AOA', 'Kz');
}

// 1. Renderização do Catálogo
function renderProducts(filterCategory = 'all') {
  const container = document.getElementById('productGrid');
  if (!container) return;

  const filtered = filterCategory === 'all' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === filterCategory);

  container.innerHTML = filtered.map(p => `
    <article class="product-card" data-id="${p.id}">
      <div>
        <span class="product-category">${p.category}</span>
        <h3 class="product-title">${p.title}</h3>
        <p class="product-specs">${p.specs}</p>
      </div>
      <div class="product-bottom">
        <div class="product-price">
          ${formatAoa(p.priceAoa)}
          <small>por ${p.unit}</small>
        </div>
        <button type="button" class="btn-add-item" data-add="${p.id}">
          + Adicionar
        </button>
      </div>
    </article>
  `).join('');

  // Event Listeners nos botões Adicionar
  container.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.getAttribute('data-add');
      addToCart(prodId);
    });
  });
}

// 2. Filtros de Categoria
function setupCategoryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderProducts(cat);
    });
  });
}

// 3. Gestão do Carrinho
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCartUi();
  openCart();
}

function updateCartUi() {
  const countEl = document.getElementById('cartCount');
  const listEl = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalAoa');

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + (item.priceAoa * item.quantity), 0);

  if (countEl) countEl.textContent = totalQuantity;
  if (totalEl) totalEl.textContent = formatAoa(totalAmount);

  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = `
      <li style="color: #666; font-size: 0.85rem; padding: 2rem 0; text-align: center;">
        O seu pedido está vazio. Selecione itens do catálogo abaixo.
      </li>
    `;
    return;
  }

  listEl.innerHTML = cart.map((item, index) => `
    <li class="cart-item">
      <div>
        <h5>${item.title}</h5>
        <p>${item.quantity}x ${formatAoa(item.priceAoa)}</p>
      </div>
      <div style="text-align: right;">
        <strong>${formatAoa(item.priceAoa * item.quantity)}</strong><br>
        <button type="button" data-remove="${index}" style="background: none; border: 0; color: #888; font-size: 0.75rem; text-decoration: underline; cursor: pointer; margin-top: 4px;">
          Remover
        </button>
      </div>
    </li>
  `).join('');

  listEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove'), 10);
      cart.splice(idx, 1);
      updateCartUi();
    });
  });
}

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.style.display = 'block';
}

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.style.display = 'none';
}

function setupCartDrawer() {
  document.getElementById('openCartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  document.getElementById('btnSubmitCart')?.addEventListener('click', () => {
    if (cart.length === 0) {
      alert('Adicione pelo menos um produto ao seu pedido para gerar cotação.');
      return;
    }
    const totalAmount = cart.reduce((acc, item) => acc + (item.priceAoa * item.quantity), 0);
    const summary = cart.map(i => `• ${i.quantity}x ${i.title} (${formatAoa(i.priceAoa * i.quantity)})`).join('\n');
    
    alert(`Pedido TradeX preparado!\n\nItens:\n${summary}\n\nTotal Previsto: ${formatAoa(totalAmount)}\n\nEntraremos em contacto para emissão da Fatura Pró-forma em AOA.`);
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

  const USD_TO_AOA = 950; // Câmbio de referência

  function calculate() {
    const mode = modeSelect.value;
    const volume = parseFloat(volumeInput.value) || 0;
    const weight = parseFloat(weightInput.value) || 0;
    const cargoUsd = parseFloat(valueInput.value) || 0;

    const baseMercadoriaAoa = cargoUsd * USD_TO_AOA;
    let freightUsd = 0;

    if (mode === 'sea_lcl') {
      // Carga consolidada marítima: ~$180 por m3 ou cada 500kg
      const chargeableVolume = Math.max(volume, weight / 500);
      freightUsd = chargeableVolume * 190;
    } else if (mode === 'sea_fcl') {
      // Contentor 20ft completo fechado: ~$3200 base
      freightUsd = 3200;
    } else if (mode === 'air_exp') {
      // Aéreo expresso: ~$14 por kg
      freightUsd = Math.max(weight, volume * 167) * 14.5;
    }

    const freteAoa = freightUsd * USD_TO_AOA;
    const seguroAoa = (baseMercadoriaAoa + freteAoa) * 0.02; // 2% seguro marítimo
    const taxasDespachoAoa = (baseMercadoriaAoa * 0.14) + 120000; // Estimativa direitos + despacho Luanda
    const totalGeral = baseMercadoriaAoa + freteAoa + seguroAoa + taxasDespachoAoa;

    if (valMercadoriaAoa) valMercadoriaAoa.textContent = formatAoa(baseMercadoriaAoa);
    if (valFreteAoa) valFreteAoa.textContent = formatAoa(freteAoa);
    if (valSeguroAoa) valSeguroAoa.textContent = formatAoa(seguroAoa);
    if (valDespachoAoa) valDespachoAoa.textContent = formatAoa(taxasDespachoAoa);
    if (valTotalAoa) valTotalAoa.textContent = formatAoa(totalGeral);
  }

  btnCalculate?.addEventListener('click', calculate);
  modeSelect?.addEventListener('change', calculate);
  volumeInput?.addEventListener('input', calculate);
  weightInput?.addEventListener('input', calculate);
  valueInput?.addEventListener('input', calculate);

  // Cálculo inicial
  calculate();
}

// 5. Rastreio de Carga com Timeline Real
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
    details.style.display = 'block';

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

// 6. Formulário de Sourcing Direto
function setupSourcingForm() {
  const form = document.getElementById('sourcingForm');
  const successMsg = document.getElementById('sourcingSuccessMsg');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (successMsg) {
      successMsg.style.display = 'block';
      form.reset();
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 7000);
    }
  });
}

// Inicialização Geral
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  setupCategoryFilters();
  setupCartDrawer();
  setupCalculator();
  setupTracking();
  setupSourcingForm();

  // Verificação de saúde da API de backend
  void api.health();
});
