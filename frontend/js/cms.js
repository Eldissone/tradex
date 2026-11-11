// Gestor de Conteúdos Públicos (CMS) - TradeX Global
// Sincroniza Catálogo em Destaque (index.html), Hero Slider (catalogo.html), Banners, Promoções e FAQs.

import { api } from './api.js';
import { authStore } from './auth.js';

// Cópia local (cache) da versão publicada no servidor
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
      lead: 'Fornecedores validados nas principais províncias industriais da China (Guangdong, Zhejiang, Jiangsu, Shandong). Entrega porta a porta em Angola.',
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
      subtitle: 'Compre a preços de fábrica com liquidação em Kwanzas e entrega porta a porta.',
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
      title: 'Guia 2026: Como Importar Equipamentos Industriais e Agrícolas com a TradeX',
      category: 'Guias',
      summary: 'Passo a passo desde a escolha do produto até à entrega porta a porta em Angola.',
      date: '28 Out 2026',
      author: 'Equipa TradeX',
      status: 'Publicado'
    }
  ],

  // 6. Perguntas Frequentes (FAQ)
  faqs: [
    {
      id: 'faq-1',
      question: 'O que é a TradeX Global Trading?',
      answer: 'A TradeX é uma plataforma corporativa de comércio e logística internacional que conecta empresas e importadores em Angola diretamente aos principais fabricantes industriais da China, com cotação e liquidação oficial em Kwanzas (AOA).',
      category: 'Geral',
      order: 1,
      active: true
    },
    {
      id: 'faq-2',
      question: 'Quais métodos de pagamento a TradeX suporta?',
      answer: 'Suportamos pagamentos diretos em Kwanzas através de Multicaixa Express, Pagamento por Referência Bancária (GPO/EMIS) e transferência direta para as nossas contas corporativas em Luanda.',
      category: 'Pagamentos',
      order: 2,
      active: true
    },
    {
      id: 'faq-3',
      question: 'Como funciona o Pagamento por Referência?',
      answer: 'O Pagamento por Referência permite gerar referências bancárias únicas para pagamentos e confirmar a transação de forma simples, organizada e com reconciliação imediata.',
      category: 'Pagamentos',
      order: 3,
      active: true
    },
    {
      id: 'faq-4',
      question: 'Quanto tempo demora para receber as mercadorias da China?',
      answer: 'Para frete marítimo consolidado (contentores FCL ou grupagem LCL), o tempo médio de trânsito é de 30 a 60 dias até ao Porto de Luanda. Para envios aéreos prioritários, a entrega é realizada em 5 a 15 dias.',
      category: 'Logística',
      order: 4,
      active: true
    },
    {
      id: 'faq-5',
      question: 'Preciso de tratar de alguma burocracia para receber a encomenda?',
      answer: 'Não. O nosso agente parceiro trata de todo o transporte da China até Angola. Só tem de levantar a encomenda no Terminal TradeX ou recebê-la na morada indicada.',
      category: 'Entregas',
      order: 5,
      active: true
    },
    {
      id: 'faq-6',
      question: 'Posso solicitar cotação de produtos que não constam no catálogo online?',
      answer: 'Sim! Através do nosso serviço de Sourcing Especializado, pode submeter especificações técnicas, referências ou catálogos de fornecedores chineses para receber uma proposta completa chave-na-mão.',
      category: 'Sourcing',
      order: 6,
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
      title: 'Política de Entregas e Garantia de Carga',
      slug: '/politica-entregas',
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
        catalogHeroSlides: parsed.catalogHeroSlides || DEFAULT_CMS_DATA.catalogHeroSlides,
        faqs: (Array.isArray(parsed.faqs) && parsed.faqs.length >= 6) ? parsed.faqs : DEFAULT_CMS_DATA.faqs
      };
    } catch {
      return DEFAULT_CMS_DATA;
    }
  },

  // Grava a cache e, para a equipa, publica no servidor (visível para todos os visitantes)
  saveData(data) {
    try {
      localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(data));
    } catch {}
    window.dispatchEvent(new CustomEvent('tradex:cms-changed', { detail: data }));
    if (authStore.isStaff()) {
      return api.admin.saveSetting('cms', data).then(res => {
        if (!res.ok) alert(`Os conteúdos não foram publicados: ${res.message}`);
        return res;
      });
    }
    return Promise.resolve({ ok: false });
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


// Carrega a versão publicada no servidor
let cmsLoad = null;
export function loadCms() {
  if (cmsLoad) return cmsLoad;
  cmsLoad = api.config.cms().then(res => {
    if (!res.ok) return null;
    const published = res.data.data;
    let local = null;
    try { local = JSON.parse(localStorage.getItem(CMS_STORAGE_KEY) || 'null'); } catch {}

    if (published) {
      try { localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(published)); } catch {}
      window.dispatchEvent(new CustomEvent('tradex:cms-changed', { detail: published }));
    } else if (local && authStore.isStaff()) {
      // Primeira publicação: a equipa tinha alterações só neste browser
      cmsStore.saveData(local);
    } else if (local) {
      // Visitante com uma cópia antiga: volta aos conteúdos por defeito
      try { localStorage.removeItem(CMS_STORAGE_KEY); } catch {}
      window.dispatchEvent(new CustomEvent('tradex:cms-changed', { detail: DEFAULT_CMS_DATA }));
    }
    return published;
  }).finally(() => { setTimeout(() => { cmsLoad = null; }, 0); });
  return cmsLoad;
}
