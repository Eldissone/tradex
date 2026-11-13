import { esc } from './esc.js';
import { PRODUCTS_DATA, loadProducts } from './product-store.js';
import { cartStore, renderCartList } from './cart.js';
import { api } from './api.js';

let currentProduct = null;
let currentQuantity = 1;

function renderAll(product) {
  renderProductDetails(product);
  renderThumbnails(product);
  renderTechSpecs(product);
  renderLogistics(product);
  renderRelatedProducts(product);
}

function showNotFound() {
  document.title = 'Produto não encontrado | TradeX Global Trading';
  const titleEl = document.getElementById('productTitle');
  if (titleEl) titleEl.textContent = 'Produto não encontrado';
  const descEl = document.getElementById('productDescription');
  if (descEl) descEl.innerHTML = 'Este produto já não está disponível. <a href="catalogo">Ver o catálogo</a>.';
  document.querySelectorAll('#productPriceAoa, #productUnitInfo').forEach(el => { el.textContent = ''; });
  document.getElementById('btnAddToCartDetail')?.setAttribute('disabled', 'true');
}

function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  setupQuantitySelector();
  setupAddToCart();
  setupCartDrawer();
  updateCartUi();
  window.addEventListener('tradex:cart-changed', (e) => { if (e.detail?.source === 'server') updateCartUi(); });

  // Os produtos vêm da base de dados: só se renderiza quando o produto existe
  const apply = () => {
    const found = PRODUCTS_DATA.find(p => p.id === productId || p.slug === productId);
    if (!found) return false;
    currentProduct = found;
    renderAll(found);
    return true;
  };

  apply();
  window.addEventListener('tradex:products-changed', apply);
  loadProducts().then(() => { if (!apply() && !currentProduct) showNotFound(); });
}

// 1. Renderiza os Detalhes Principais
function renderProductDetails(product) {
  document.title = `${product.title} | TradeX Global Trading`;

  const breadcrumbEl = document.getElementById('breadcrumbTitle');
  const categoryBadge = document.getElementById('productCategoryBadge');
  const originBadge = document.getElementById('productOriginBadge');
  const titleEl = document.getElementById('productTitle');
  const priceEl = document.getElementById('productPriceAoa');
  const unitInfoEl = document.getElementById('productUnitInfo');
  const descEl = document.getElementById('productDescription');
  const mainImg = document.getElementById('mainProductImg');
  const angleBadge = document.getElementById('activeAngleBadge');

  if (breadcrumbEl) breadcrumbEl.textContent = product.title;
  if (categoryBadge) categoryBadge.textContent = product.categoryLabel;
  if (originBadge) originBadge.textContent = product.origin;
  if (titleEl) titleEl.textContent = product.title;
  if (priceEl) priceEl.textContent = cartStore.formatAoa(product.priceAoa);
  if (unitInfoEl) unitInfoEl.textContent = `Preço por ${product.unit} (MOQ: ${product.moq})`;
  if (descEl) descEl.textContent = product.description;

  if (mainImg && product.images && product.images.length > 0) {
    mainImg.src = product.images[0].url;
    mainImg.alt = product.title;
  }
  if (angleBadge && product.images && product.images.length > 0) {
    angleBadge.textContent = product.images[0].label;
  }
}

// 2. Renderiza as 3 Miniaturas de Ângulos Diferentes
function renderThumbnails(product) {
  const container = document.getElementById('productThumbnails');
  const mainImg = document.getElementById('mainProductImg');
  const angleBadge = document.getElementById('activeAngleBadge');
  if (!container || !product.images) return;

  container.innerHTML = product.images.map((img, index) => `
    <button type="button" class="product-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
      <img src="${esc(img.url)}" alt="${esc(img.label)}" loading="lazy" decoding="async" />
      <span class="product-thumb-label">Ângulo ${index + 1}</span>
    </button>
  `).join('');

  const thumbBtns = container.querySelectorAll('.product-thumb');
  thumbBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      thumbBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selected = product.images[idx];
      if (selected && mainImg) {
        mainImg.classList.add('transitioning');
        setTimeout(() => {
          mainImg.src = selected.url;
          mainImg.classList.remove('transitioning');
        }, 120);

        if (angleBadge) {
          angleBadge.textContent = selected.label;
        }
      }
    });
  });
}

// 3. Ficha Técnica
function renderTechSpecs(product) {
  const tbody = document.getElementById('techSpecsTableBody');
  if (!tbody || !product.techSpecs) return;

  tbody.innerHTML = product.techSpecs.map(spec => `
    <tr>
      <th>${esc(spec.label)}</th>
      <td>${esc(spec.value)}</td>
    </tr>
  `).join('');
}

// 4. Informações de Logística
function renderLogistics(product) {
  const container = document.getElementById('logisticsInfoGrid');
  if (!container || !product.logistics) return;

  const log = product.logistics;
  container.innerHTML = `
    <div class="logistics-card">
      <h4>Origem & Embarque</h4>
      <p><strong>Porto:</strong> ${log.originPort}</p>
      <p>Inspeção de qualidade e embalagem antes do envio.</p>
    </div>
    <div class="logistics-card">
      <h4>Destino & Entrega</h4>
      <p><strong>Desembarque:</strong> ${log.destinationPort}</p>
      <p>Entrega porta a porta ou levantamento gratuito no Terminal TradeX.</p>
    </div>
    <div class="logistics-card">
      <h4>Prazos de Trânsito</h4>
      <p><strong>Marítimo:</strong> ${log.transitTimeSea}</p>
      <p><strong>Aéreo:</strong> ${log.transitTimeAir}</p>
    </div>
    <div class="logistics-card">
      <h4>Acondicionamento</h4>
      <p>${log.packing}</p>
    </div>
  `;
}

// 5. Produtos Relacionados
function renderRelatedProducts(current) {
  const container = document.getElementById('relatedProductsGrid');
  if (!container) return;

  const related = PRODUCTS_DATA
    .filter(p => p.id !== current.id)
    .slice(0, 3);

  container.innerHTML = related.map(p => `
    <article class="product-card" data-id="${p.id}">
      <div>
        <a href="produto?id=${p.id}" class="nav-link">
          <div class="product-mirror-box">
            <div class="product-mirror-sheen"></div>
            <img src="${esc(p.image)}" alt="${esc(p.title)}" class="product-mirror-img" loading="lazy" />
            <div class="product-mirror-base"></div>
          </div>
          <span class="product-category">${p.categoryLabel}</span>
          <h3 class="product-title">${esc(p.title)}</h3>
          <p class="product-specs">${esc(p.specs)}</p>
        </a>
      </div>
      <div class="product-bottom">
        <div class="product-price">
          ${cartStore.formatAoa(p.priceAoa)}
          <small>por ${esc(p.unit)}</small>
        </div>
        <a href="produto?id=${p.id}" class="btn-add-item">
          Ver Detalhes
        </a>
      </div>
    </article>
  `).join('');
}

// 6. Controlo de Quantidade
function setupQuantitySelector() {
  const minusBtn = document.getElementById('qtyMinusBtn');
  const plusBtn = document.getElementById('qtyPlusBtn');
  const input = document.getElementById('productQtyInput');

  if (!input) return;

  minusBtn?.addEventListener('click', () => {
    let val = parseInt(input.value, 10) || 1;
    if (val > 1) {
      val -= 1;
      input.value = val;
      currentQuantity = val;
    }
  });

  plusBtn?.addEventListener('click', () => {
    let val = parseInt(input.value, 10) || 1;
    if (val < 99) {
      val += 1;
      input.value = val;
      currentQuantity = val;
    }
  });

  input.addEventListener('change', () => {
    let val = parseInt(input.value, 10) || 1;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    input.value = val;
    currentQuantity = val;
  });
}

// 7. Adicionar ao Pedido
function setupAddToCart() {
  const btn = document.getElementById('btnAddToCartDetail');
  btn?.addEventListener('click', () => {
    if (!currentProduct) return;

    cartStore.addItem(currentProduct, currentQuantity);
    updateCartUi();
    openCart();
  });
}

// 8. Carrinho / Gaveta
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

document.addEventListener('DOMContentLoaded', initProductPage);
