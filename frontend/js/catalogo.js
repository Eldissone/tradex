import { cartStore } from './cart.js';
import { api } from './api.js';

export const ALL_PRODUCTS = [
  {
    id: 'prod-01',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Kit Painéis Solares Monocristalinos 550W (Palete com 30 un.)',
    origin: 'Foshan, Guangdong',
    moq: '1 Palete (30 painéis)',
    specs: 'Tier 1 Fabrico Foshan | Eficiência 21.3% | Vidro temperado antirreflexo | Garantia 12 anos',
    priceAoa: 3450000,
    unit: 'palete'
  },
  {
    id: 'prod-02',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Inversor Solar Híbrido 5.5kW 48V Pure Sine Wave',
    origin: 'Shenzhen, Guangdong',
    moq: '1 Unidade',
    specs: 'Compatível com Baterias Lítio & Gel | Controlador MPPT 100A integrado | Monitorização Wi-Fi',
    priceAoa: 820000,
    unit: 'unidade'
  },
  {
    id: 'prod-03',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Bateria de Lítio LiFePO4 48V 100Ah (5.12kWh Rack Mount)',
    origin: 'Dongguan, Guangdong',
    moq: '1 Unidade',
    specs: 'Mais de 6000 ciclos a 80% DOD | BMS inteligente integrado | Comunicação CAN/RS485',
    priceAoa: 1250000,
    unit: 'unidade'
  },
  {
    id: 'prod-04',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Mini Betoneira Elétrica 350L Motor Cobre 220V',
    origin: 'Guangzhou, Guangdong',
    moq: '2 Unidades',
    specs: 'Tambor reforçado 3mm | Rodas de ferro fundido com revestimento | Capacidade mistura 260L',
    priceAoa: 680000,
    unit: 'unidade'
  },
  {
    id: 'prod-05',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Conjunto de Andaimes Modulares Galvanizados (100 m²)',
    origin: 'Tianjin',
    moq: '1 Lote de 100 m²',
    specs: 'Aço carbono Q235 galvanizado a quente | Travessas diagonais, guarda-corpos e pranchas antiderrapantes',
    priceAoa: 1950000,
    unit: 'conjunto'
  },
  {
    id: 'prod-06',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Compactador de Solo Tipo Sapo (Motor Gasolina 5.5HP)',
    origin: 'Yiwu, Zhejiang',
    moq: '1 Unidade',
    specs: 'Força de impacto 13.7 kN | Tanque anticorrosivo | Ideal para valas e alicerces',
    priceAoa: 540000,
    unit: 'unidade'
  },
  {
    id: 'prod-07',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Máquina Bloqueira Hidráulica para Blocos de Cimento',
    origin: 'Linyi, Shandong',
    moq: '1 Linha Completa',
    specs: 'Produção 2500 blocos/dia | Moldes intercambiáveis para blocos de 10, 15 e 20cm',
    priceAoa: 3900000,
    unit: 'linha'
  },
  {
    id: 'prod-08',
    category: 'electronics',
    categoryLabel: 'Eletrónicos & Iluminação',
    title: 'Campânula LED Industrial High Bay 200W IP65 (Caixa 10 un.)',
    origin: 'Zhongshan, Guangdong',
    moq: '1 Caixa (10 un.)',
    specs: 'Luminosidade 26.000 lm | Temperatura 6500K Luz Fria | Driver isolado Meanwell',
    priceAoa: 490000,
    unit: 'caixa'
  },
  {
    id: 'prod-09',
    category: 'electronics',
    categoryLabel: 'Eletrónicos & Iluminação',
    title: 'Refletores Solares LED 300W com Painel & Comando (Lote 20 un.)',
    origin: 'Zhongshan, Guangdong',
    moq: '1 Lote (20 un.)',
    specs: 'Bateria LiFePO4 de alta capacidade | Sensor de movimento crepuscular | Autonomia 12-14 horas',
    priceAoa: 560000,
    unit: 'lote'
  },
  {
    id: 'prod-10',
    category: 'machinery',
    categoryLabel: 'Maquinaria & Geradores',
    title: 'Conjunto Gerador Diesel Silencioso 15kVA Trifásico',
    origin: 'Wuxi, Jiangsu',
    moq: '1 Unidade',
    specs: 'Motor diesel 4 cilindros refrigerado a água | Cabine insonorizada 68dB | Painel ATS automático',
    priceAoa: 3200000,
    unit: 'unidade'
  },
  {
    id: 'prod-11',
    category: 'machinery',
    categoryLabel: 'Maquinaria & Geradores',
    title: 'Mini Trator Agrícola 25HP 4x4 com Freza e Arado',
    origin: 'Weifang, Shandong',
    moq: '1 Unidade',
    specs: 'Motor diesel monocilíndrico de alta compressão | Tração integral 4x4 | Tomada de força PTO standard',
    priceAoa: 4800000,
    unit: 'unidade'
  },
  {
    id: 'prod-12',
    category: 'construction',
    categoryLabel: 'Materiais de Construção',
    title: 'Telhas Trapezoidais Aluzinco Calibre 28 (Lote 100 folhas de 6m)',
    origin: 'Foshan, Guangdong',
    moq: '1 Lote (100 folhas)',
    specs: 'Revestimento AZ150 anticorrosão tropical | Largura útil 1000mm | Resistência elevada aos UV',
    priceAoa: 1650000,
    unit: 'lote'
  }
];

let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'featured';

function renderCatalog() {
  const container = document.getElementById('catalogGrid');
  const countEl = document.getElementById('resultsCount');
  if (!container) return;

  let filtered = ALL_PRODUCTS.filter(p => {
    const matchCategory = currentCategory === 'all' || p.category === currentCategory;
    const matchSearch = !currentSearch || 
      p.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
      p.specs.toLowerCase().includes(currentSearch.toLowerCase()) ||
      p.origin.toLowerCase().includes(currentSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (currentSort === 'price-asc') {
    filtered.sort((a, b) => a.priceAoa - b.priceAoa);
  } else if (currentSort === 'price-desc') {
    filtered.sort((a, b) => b.priceAoa - a.priceAoa);
  }

  if (countEl) {
    countEl.textContent = `${filtered.length} produtos encontrados`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty-state">
        <h3 class="catalog-empty-title">Nenhum produto encontrado</h3>
        <p class="catalog-empty-desc">Tente pesquisar por outros termos ou solicite uma cotação de sourcing personalizado.</p>
        <a href="#sourcing" class="btn-dark catalog-empty-action">Solicitar Cotação Direta da China</a>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <article class="product-card" data-id="${p.id}">
      <div>
        <div class="product-card-top">
          <span class="product-category">${p.categoryLabel}</span>
          <span class="product-origin">${p.origin}</span>
        </div>
        <h3 class="product-title">${p.title}</h3>
        <p class="product-specs">${p.specs}</p>
        <p class="badge-moq"><strong>Qtd. Mínima (MOQ):</strong> ${p.moq}</p>
      </div>
      <div class="product-bottom">
        <div class="product-price">
          ${cartStore.formatAoa(p.priceAoa)}
          <small>por ${p.unit}</small>
        </div>
        <button type="button" class="btn-add-item" data-add="${p.id}">
          + Pedido
        </button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-add');
      const prod = ALL_PRODUCTS.find(p => p.id === id);
      if (prod) {
        cartStore.addItem(prod);
        updateCartUi();
        openCart();
      }
    });
  });
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
        O seu pedido está vazio. Selecione itens do catálogo.
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

function setupFiltersAndSearch() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderCatalog();
    });
  });

  const searchInput = document.getElementById('catalogSearch');
  const searchForm = document.getElementById('searchForm');

  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    currentSearch = searchInput ? searchInput.value.trim() : '';
    renderCatalog();
  });

  searchInput?.addEventListener('input', () => {
    currentSearch = searchInput.value.trim();
    renderCatalog();
  });

  const sortSelect = document.getElementById('catalogSort');
  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderCatalog();
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
  renderCatalog();
  setupFiltersAndSearch();
  setupCartDrawer();
  updateCartUi();
  setupSourcingForm();

  void api.health();
});
