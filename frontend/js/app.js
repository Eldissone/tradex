import { api } from './api.js';
import { cartStore } from './cart.js';

// Catálogo inicial em destaque (Sourcing Direto China ➔ Angola)
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

// 1. Renderização do Catálogo em Destaque
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
          ${cartStore.formatAoa(p.priceAoa)}
          <small>por ${p.unit}</small>
        </div>
        <button type="button" class="btn-add-item" data-add="${p.id}">
          + Adicionar
        </button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-add]').forEach(btn => {
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
}

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

// 2. Gestão do Carrinho Compartilhada
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
      <li style="color: #666; font-size: 0.85rem; padding: 2rem 0; text-align: center;">
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
      <div style="text-align: right;">
        <strong>${cartStore.formatAoa(item.priceAoa * item.quantity)}</strong><br>
        <button type="button" data-remove="${index}" style="background: none; border: 0; color: #888; font-size: 0.75rem; text-decoration: underline; cursor: pointer; margin-top: 4px;">
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

// 3. Simulador Logístico China ➔ Angola
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

// 4. Rastreio de Carga
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

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  setupCategoryFilters();
  setupCartDrawer();
  updateCartUi();
  setupCalculator();
  setupTracking();
  setupSourcingForm();

  void api.health();
});
