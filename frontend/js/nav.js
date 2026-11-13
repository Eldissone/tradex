// TradeX Global Trading - Navegação principal partilhada
// Cabeçalho simplificado: "Produtos" (menu suspenso com categorias) e "Rastreio".
// Injectado em qualquer elemento com o atributo [data-shared-nav].

export const NAV_CATEGORIES = [
  {
    slug: 'solar',
    label: 'Energia Solar',
    icon: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>'
  },
  {
    slug: 'industrial',
    label: 'Construção & Equipamento',
    icon: '<path d="M2 20h20"></path><path d="M5 20V8l7-5 7 5v12"></path><path d="M9 20v-6h6v6"></path>'
  },
  {
    slug: 'construction',
    label: 'Materiais de Construção',
    icon: '<rect x="3" y="4" width="18" height="6" rx="1"></rect><rect x="3" y="14" width="8" height="6" rx="1"></rect><rect x="13" y="14" width="8" height="6" rx="1"></rect>'
  },
  {
    slug: 'machinery',
    label: 'Maquinaria & Geradores',
    icon: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
  },
  {
    slug: 'electronics',
    label: 'Eletrónicos & Iluminação',
    icon: '<rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path>'
  }
];

const svg = (paths, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

function currentPage() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  return file.replace('.html', '') || 'index';
}

function renderNav(container) {
  const page = currentPage();
  const productsActive = page === 'catalogo' || page === 'produto';
  const trackingActive = page === 'rastreio';

  const items = NAV_CATEGORIES.map(c => `
    <li role="none">
      <a role="menuitem" href="catalogo?categoria=${c.slug}" class="nav-dd-item">
        ${c.label}
      </a>
    </li>`).join('');

  container.innerHTML = `
    <div class="nav-dd">
      <button type="button" class="nav-dd-toggle${productsActive ? ' nav-link-active' : ''}" aria-haspopup="true" aria-expanded="false" aria-controls="navProductsMenu">
        Produtos
        ${svg('<polyline points="6 9 12 15 18 9"></polyline>', 14)}
      </button>
      <div class="nav-dd-menu" id="navProductsMenu">
        <div class="nav-dd-inner">
          <div class="nav-dd-intro">
            <p class="nav-dd-title">Tudo da China, entregue em Angola</p>
            <a href="catalogo" class="nav-dd-cta">Ver todos os produtos</a>
          </div>
          <div class="nav-dd-section">
            <p class="nav-dd-heading">Categorias</p>
            <ul class="nav-dd-list" role="menu" aria-label="Categorias de produtos">
              ${items}
            </ul>
          </div>
        </div>
      </div>
    </div>
    <a href="rastreio"${trackingActive ? ' class="nav-link-active"' : ''}>Rastreio</a>
  `;

  const dd = container.querySelector('.nav-dd');
  const toggle = dd.querySelector('.nav-dd-toggle');

  const setOpen = (open) => {
    dd.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!dd.classList.contains('open'));
  });

  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dd.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

// Menu hambúrguer (≤ 768 px): recolhe os links num painel sob o cabeçalho
function setupBurger(container) {
  const header = container.closest('.main-header');
  const actions = header && header.querySelector('.nav-actions');
  if (!header || !actions || actions.querySelector('.nav-burger')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-icon-btn nav-burger';
  btn.setAttribute('aria-label', 'Abrir menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML =
    '<svg class="header-icon icon-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"></path></svg>' +
    '<svg class="header-icon icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  actions.appendChild(btn);

  const setOpen = (open) => {
    header.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!header.classList.contains('nav-open'));
  });
  container.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) {
      setOpen(false);
      btn.focus();
    }
  });
  window.matchMedia('(min-width: 769px)').addEventListener('change', (m) => {
    if (m.matches) setOpen(false);
  });
}

function init() {
  document.querySelectorAll('[data-shared-nav]').forEach((c) => {
    renderNav(c);
    setupBurger(c);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
