// Gestor de Conteúdos Públicos (CMS) - TradeX Global
// Sincroniza Catálogo em Destaque (index.html), Hero Slider (catalogo.html), Banners, Promoções e FAQs.

export const CMS_STORAGE_KEY = 'tradex_cms_data_v2';

export const DEFAULT_CMS_DATA = {
  // 1. Gestão do "Catálogo em Destaque" na Homepage (index.html)
  featuredCatalog: {
    eyebrow: 'CATÁLOGO EM DESTAQUE',
    title: 'Produtos com fornecedor validado na China',
    subtitle: 'Equipamentos industriais, soluções de energia solar e bens de consumo com cotação imediata em Kwanza (AOA).',
    productIds: ['prod-01', 'prod-02', 'prod-03', 'prod-04', 'prod-05', 'prod-06']
  },

  // 2. Gestão do Hero Slider do Catálogo (catalogo.html)
  catalogHeroSlides: [
    {
      id: 'slide-cat-1',
      title: 'Produtos industriais e comerciais com preços em Kwanza.',
      lead: 'Fornecedores validados nas principais províncias industriais da China (Guangdong, Zhejiang, Jiangsu, Shandong). Despacho aduaneiro e entrega integrada em Luanda.',
      image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&auto=format&fit=crop&q=80',
      order: 1,
      active: true
    },
    {
      id: 'slide-cat-2',
      title: 'Soluções solares completas com garantia de fábrica.',
      lead: 'Painéis monocristalinos Tier 1, inversores híbridos inteligentes e baterias de lítio LiFePO4 para projetos residenciais, comerciais e industriais em Angola.',
      image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1600&auto=format&fit=crop&q=80',
      order: 2,
      active: true
    },
    {
      id: 'slide-cat-3',
      title: 'Equipamento pesado e materiais para grandes projetos.',
      lead: 'Máquinas bloqueiras hidráulicas, andaimes modulares galvanizados e geradores diesel com frete marítimo consolidado FCL e LCL até ao Porto de Luanda.',
      image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=1600&auto=format&fit=crop&q=80',
      order: 3,
      active: true
    }
  ],

  // 3. Banners Gerais & Homepage
  banners: [
    {
      id: 'banner-1',
      title: 'Importação Direta China–Angola sem Intermediários',
      subtitle: 'Compre a preços de fábrica com liquidação em Kwanzas e desembaraço aduaneiro completo.',
      badge: 'Cotação Oficial em Kwanzas (AOA)',
      ctaText: 'Explorar Catálogo',
      ctaLink: 'catalogo.html',
      location: 'Hero Principal (index.html)',
      active: true
    },
    {
      id: 'banner-2',
      title: 'Frete Marítimo Consolidado Guangzhou -> Porto de Luanda',
      subtitle: 'Contentores com saídas regulares, controlo de qualidade e rastreamento digital.',
      badge: 'Rotas Semanais Marítimas',
      ctaText: 'Simular Frete',
      ctaLink: 'index.html#simulador',
      location: 'Faixa Intermediária',
      active: true
    }
  ],

  // 4. Promoções & Campanhas
  promotions: [
    {
      id: 'promo-1',
      title: 'Campanha Energia Solar: 10% Desconto em Painéis Monocristalinos',
      code: 'SOLARANGOLA10',
      discount: '10% OFF',
      category: 'Energia Solar',
      validUntil: '2026-12-31',
      active: true
    },
    {
      id: 'promo-2',
      title: 'Desconto de Frete na Primeira Importação de Contentor Fechado',
      code: 'IMPORTACONT26',
      discount: '500 000 Kz',
      category: 'Construção & Equipamentos',
      validUntil: '2026-11-30',
      active: true
    }
  ],

  // 5. Notícias e Artigos
  news: [
    {
      id: 'news-1',
      title: 'Novas Rotas Diretas entre o Porto de Nansha e Luanda Reduzem Trânsito para 32 Dias',
      category: 'Logística Marítima',
      summary: 'Parcerias portuárias estratégicas aceleram a entrega de maquinarias e painéis solares no mercado angolano.',
      date: '05 Nov 2026',
      author: 'Equipa TradeX Luanda',
      status: 'Publicado'
    },
    {
      id: 'news-2',
      title: 'Guia Aduaneiro 2026: Desembaraço Simplificado para Equipamentos Industriais e Agrícolas',
      category: 'Alfândega & AGT',
      summary: 'Procedimentos necessários para a emissão do DU (Documento Único) e recolha de taxas portuárias.',
      date: '28 Out 2026',
      author: 'Gabinete Aduaneiro TradeX',
      status: 'Publicado'
    }
  ],

  // 6. Perguntas Frequentes (FAQ)
  faqs: [
    {
      id: 'faq-1',
      question: 'Como funciona o pagamento em Kwanzas via Multicaixa Express e Referência?',
      answer: 'O cliente realiza o pagamento em Kwanzas (AOA) via Multicaixa Express ou Referência bancária. A TradeX processa o pagamento e efetua a liquidação cambial junto aos fabricantes na China.',
      category: 'Pagamentos',
      order: 1,
      active: true
    },
    {
      id: 'faq-2',
      question: 'Qual é o prazo médio de entrega de mercadorias vindas da China?',
      answer: 'Para remessas marítimas consolidadas, o trânsito varia entre 32 e 38 dias até ao Porto de Luanda. Para frete aéreo expresso, o prazo é de 7 a 12 dias úteis.',
      category: 'Logística & Prazos',
      order: 2,
      active: true
    },
    {
      id: 'faq-3',
      question: 'A TradeX trata de todo o desembaraço aduaneiro no Porto de Luanda?',
      answer: 'Sim, a nossa equipa de despachantes oficiais em Luanda cuida de todas as formalidades fiscais, DU (Documento Único) e taxas portuárias.',
      category: 'Alfândega',
      order: 3,
      active: true
    }
  ],

  // 7. Páginas Institucionais
  pages: [
    {
      id: 'page-1',
      title: 'Termos de Serviço & Importação por Encomenda',
      slug: '/termos-servico',
      lastUpdated: '04 Nov 2026',
      status: 'Publicado'
    },
    {
      id: 'page-2',
      title: 'Política Aduaneira e Garantia de Carga Internacional',
      slug: '/politica-aduaneira',
      lastUpdated: '01 Nov 2026',
      status: 'Publicado'
    },
    {
      id: 'page-3',
      title: 'Hub Operacional TradeX: Contactos e Horários em Luanda',
      slug: '/contactos-hub',
      lastUpdated: '06 Nov 2026',
      status: 'Publicado'
    }
  ]
};

export const cmsStore = {
  getData() {
    try {
      const raw = localStorage.getItem(CMS_STORAGE_KEY);
      if (!raw) return DEFAULT_CMS_DATA;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CMS_DATA,
        ...parsed,
        featuredCatalog: { ...DEFAULT_CMS_DATA.featuredCatalog, ...(parsed.featuredCatalog || {}) },
        catalogHeroSlides: parsed.catalogHeroSlides || DEFAULT_CMS_DATA.catalogHeroSlides
      };
    } catch {
      return DEFAULT_CMS_DATA;
    }
  },

  saveData(data) {
    try {
      localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('tradex:cms-changed', { detail: data }));
    } catch {}
  },

  getFeaturedCatalog() {
    return this.getData().featuredCatalog;
  },

  saveFeaturedCatalog(config) {
    const data = this.getData();
    data.featuredCatalog = { ...data.featuredCatalog, ...config };
    this.saveData(data);
  },

  isProductFeatured(prodId) {
    const list = this.getFeaturedCatalog().productIds || [];
    return list.includes(prodId);
  },

  toggleProductFeatured(prodId) {
    const data = this.getData();
    let list = data.featuredCatalog.productIds || [];
    if (list.includes(prodId)) {
      list = list.filter(id => id !== prodId);
    } else {
      list.push(prodId);
    }
    data.featuredCatalog.productIds = list;
    this.saveData(data);
    return list.includes(prodId);
  },

  getCatalogHeroSlides() {
    const slides = this.getData().catalogHeroSlides || [];
    return slides.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getActiveCatalogHeroSlides() {
    return this.getCatalogHeroSlides().filter(s => s.active);
  }
};

