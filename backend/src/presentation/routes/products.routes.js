import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma.js';

export const productsRouter = Router();

// Base de dados central de produtos inicial para o backend
const INITIAL_PRODUCTS = [
  {
    id: 'prod-01',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Kit Painéis Solares Monocristalinos 550W (Palete com 30 un.)',
    origin: 'Foshan, Guangdong',
    badge: 'Tier 1 Fabrico',
    moq: '1 Palete (30 painéis)',
    priceAoa: 3450000,
    unit: 'palete',
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 1: Vista Frontal' },
      { url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 2: Detalhe das Células' },
      { url: 'https://images.unsplash.com/photo-1559302504-64aae6ca6b6f?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 3: Paletização de Fábrica' }
    ],
    specs: 'Tier 1 Fabrico Foshan | Eficiência 21.3% | Vidro temperado antirreflexo | Garantia 12 anos',
    description: 'Módulos solares monocristalinos de alta eficiência projetados para resistir ao calor e poeira característicos de Angola.',
    logistics: {
      originPort: 'Porto de Nansha / Shenzhen (China)',
      destinationPort: 'Porto de Luanda (Angola)',
      transitTimeSea: '32 a 38 dias',
      packing: 'Palete vertical reforçada com cantoneiras plásticas'
    }
  },
  {
    id: 'prod-02',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Inversor Híbrido Trifásico Deye 10kW 48V com Monitorização Wi-Fi',
    origin: 'Ningbo, Zhejiang',
    badge: 'Alta Potência',
    moq: '1 Unidade',
    priceAoa: 1450000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=1000&auto=format&fit=crop&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 1: Visão Frontal' },
      { url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 2: Conexões DC/AC' },
      { url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 3: Embalagem Export' }
    ],
    specs: 'Saída Trifásica 380V/400V | Compatível com Baterias LiFePO4 | Monitorização App',
    description: 'Inversor inteligente ideal para instalações comerciais, industriais e residenciais em Luanda e províncias.',
    logistics: {
      originPort: 'Porto de Ningbo (China)',
      destinationPort: 'Porto de Luanda (Angola)',
      transitTimeSea: '35 a 40 dias',
      packing: 'Caixa reforçada com espuma anti-choque'
    }
  },
  {
    id: 'prod-03',
    category: 'construction',
    categoryLabel: 'Construção & Equipamento',
    title: 'Porcelanato Polido Retificado 80x80cm Carrara Grey (Caixa com 3 peças / 1.92 m²)',
    origin: 'Foshan, Guangdong',
    badge: 'Grau AAA Exportação',
    moq: '1 Contentor 20ft (1.200 m²)',
    priceAoa: 12500,
    unit: 'm²',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 1: Superfície Polida' },
      { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 2: Borda Retificada' },
      { url: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 3: Palete de Fábrica' }
    ],
    specs: 'Grau AAA | Espessura 9.5mm | Absorção de água < 0.1% | Resistente a manchas e riscos',
    description: 'Pisos e revestimentos cerâmicos de primeira qualidade produzidos nos maiores polos de porcelanato de Foshan.',
    logistics: {
      originPort: 'Porto de Nansha / Foshan (China)',
      destinationPort: 'Porto de Luanda (Angola)',
      transitTimeSea: '32 a 36 dias',
      packing: 'Paletes de madeira fumigada protegidas com cantoneiras'
    }
  },
  {
    id: 'prod-04',
    category: 'machinery',
    categoryLabel: 'Maquinaria & Geradores',
    title: 'Gerador a Diesel Insonorizado 50 kVA / 40 kW Motor Cummins',
    origin: 'Wuxi, Jiangsu',
    badge: 'Industrial Pesado',
    moq: '1 Unidade',
    priceAoa: 8900000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 1: Canópia Insonorizada' },
      { url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 2: Painel de Controlo Deepsea' },
      { url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000&auto=format&fit=crop&q=80', label: 'Ângulo 3: Bloco do Motor Cummins' }
    ],
    specs: '50 kVA Standby / 45 kVA Prime | Alternador Stamford | Painel Digital DeepSea 6120',
    description: 'Gerador elétrico insonorizado robusto para regime de emergência ou contínuo em indústrias, fazendas e obras em Angola.',
    logistics: {
      originPort: 'Porto de Shanghai (China)',
      destinationPort: 'Porto de Luanda (Angola)',
      transitTimeSea: '35 a 40 dias',
      packing: 'Caixa de madeira sólida com cobertura anticorrosão marítima'
    }
  }
];

// Lista produtos com filtros
productsRouter.get('/', async (req, res, next) => {
  try {
    const { category, search, sort } = req.query;

    let items = [...INITIAL_PRODUCTS];

    if (category && category !== 'all') {
      items = items.filter(p => p.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.specs.toLowerCase().includes(q) || 
        p.origin.toLowerCase().includes(q)
      );
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => a.priceAoa - b.priceAoa);
    } else if (sort === 'price_desc') {
      items.sort((a, b) => b.priceAoa - a.priceAoa);
    }

    return res.json({
      ok: true,
      total: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
});

// Detalhe de produto por ID
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = INITIAL_PRODUCTS.find(p => p.id === id);

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Produto não encontrado.' });
    }

    return res.json({ ok: true, data: item });
  } catch (err) {
    next(err);
  }
});

// Criação de produto (Admin)
productsRouter.post('/', async (req, res, next) => {
  try {
    const { title, category, priceAoa, origin, moq, image, specs } = req.body;
    if (!title || !priceAoa) {
      return res.status(400).json({ ok: false, message: 'Título e preço são obrigatórios.' });
    }

    const newProd = {
      id: `prod-${Date.now()}`,
      category: category || 'geral',
      title,
      priceAoa: Number(priceAoa),
      origin: origin || 'Guangdong, China',
      moq: moq || '1 Unidade',
      image: image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
      specs: specs || `Origem: ${origin || 'China'}`
    };

    INITIAL_PRODUCTS.unshift(newProd);
    return res.status(201).json({ ok: true, data: newProd });
  } catch (err) {
    next(err);
  }
});

