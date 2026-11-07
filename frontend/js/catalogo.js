import { cartStore } from './cart.js';
import { api } from './api.js';
import { PRODUCTS_DATA as ALL_PRODUCTS } from './products-data.js';

export { ALL_PRODUCTS };

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

        <a href="produto.html?id=${p.id}" class="nav-link">
          <div class="product-mirror-box">
            <div class="product-mirror-sheen"></div>
            <img src="${p.image}" alt="${p.title}" class="product-mirror-img" loading="lazy" />
            <div class="product-mirror-base"></div>
          </div>

          <h3 class="product-title">${p.title}</h3>
        </a>
        <p class="product-specs">${p.specs}</p>
        <p class="badge-moq"><strong>Qtd. Mínima (MOQ):</strong> ${p.moq}</p>
      </div>
      <div class="product-bottom">
        <div class="product-price">
          ${cartStore.formatAoa(p.priceAoa)}
          <small>por ${p.unit}</small>
        </div>
        <button type="button" class="btn-add-item" data-add="${p.id}">
          + Adicionar ao Pedido
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

  document.getElementById('headerSearchBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

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

function setupCatalogHeroSlider() {
  const slider = document.getElementById('catalogHeroSlider');
  if (!slider) return;

  const slides = slider.querySelectorAll('.catalog-slide');
  const dots = slider.querySelectorAll('.catalog-slider-dot');
  const prevBtn = document.getElementById('sliderPrevBtn');
  const nextBtn = document.getElementById('sliderNextBtn');

  if (slides.length === 0) return;

  let currentIdx = 0;
  let timer = null;
  const intervalMs = 5000; // Troca automática a cada 5 segundos

  function goToSlide(index) {
    slides[currentIdx]?.classList.remove('active');
    dots[currentIdx]?.classList.remove('active');

    currentIdx = (index + slides.length) % slides.length;

    slides[currentIdx]?.classList.add('active');
    dots[currentIdx]?.classList.add('active');
  }

  function nextSlide() {
    goToSlide(currentIdx + 1);
  }

  function prevSlide() {
    goToSlide(currentIdx - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    timer = setInterval(nextSlide, intervalMs);
  }

  function stopAutoPlay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  prevBtn?.addEventListener('click', () => {
    prevSlide();
    startAutoPlay();
  });

  nextBtn?.addEventListener('click', () => {
    nextSlide();
    startAutoPlay();
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-go'), 10);
      if (!isNaN(idx)) {
        goToSlide(idx);
        startAutoPlay();
      }
    });
  });

  slider.addEventListener('mouseenter', stopAutoPlay);
  slider.addEventListener('mouseleave', startAutoPlay);

  startAutoPlay();
}

function setupHeaderScroll() {
  const header = document.getElementById('mainHeader');
  const heroSlider = document.getElementById('catalogHeroSlider') || document.querySelector('.catalog-header');
  if (!header || !heroSlider) return;

  function onScroll() {
    const threshold = heroSlider.offsetHeight - header.offsetHeight;
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
  setupCatalogHeroSlider();
  renderCatalog();
  setupFiltersAndSearch();
  setupCartDrawer();
  updateCartUi();
  setupSourcingForm();

  void api.health();
});
