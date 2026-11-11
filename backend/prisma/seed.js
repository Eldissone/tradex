// Seed de desenvolvimento: categorias, produtos, fornecedores, lotes de envio e conta cliente demo.
// Idempotente: pode ser executado várias vezes (usa upsert).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PRODUCTS_DATA } from '../../frontend/js/products-data.js';

const prisma = new PrismaClient();

const SUPPLIERS = [
  {
    id: 'sup_001',
    name: 'Guangdong SolarTech Industrial Co.',
    province: 'Guangdong (Foshan / Guangzhou)',
    categories: ['Energia Solar', 'Baterias Lítio', 'Inversores'],
    contactPerson: 'Mr. Zhang Wei (Director Comercial)',
    email: 'export@solartech-gd.example',
    wechat: 'SolarTech_Export_CN',
    whatsapp: '+86 138 2910 4421',
    terms: 'FOB Nansha',
    rating: '5.0 ★'
  },
  {
    id: 'sup_002',
    name: 'Foshan Ceramic & Building Materials Co.',
    province: 'Guangdong (Foshan)',
    categories: ['Porcelanato', 'Revestimentos', 'Louças Sanitárias'],
    contactPerson: 'Ms. Lin Chen (Export Manager)',
    email: 'lin.chen@foshan-ceramic.example',
    wechat: 'FoshanCeramics_Lin',
    whatsapp: '+86 139 4482 1190',
    terms: 'FOB Huangpu',
    rating: '4.9 ★'
  },
  {
    id: 'sup_003',
    name: 'Zhejiang Precision Machinery & Tools',
    province: 'Zhejiang (Ningbo / Yiwu)',
    categories: ['Geradores a Diesel', 'Motores', 'Ferramentas'],
    contactPerson: 'Mr. Liu Kang (Engenheiro de Vendas)',
    email: 'sales@zj-precision.example',
    wechat: 'NingboPower_Liu',
    whatsapp: '+86 150 8821 0032',
    terms: 'FOB Ningbo-Zhoushan',
    rating: '4.8 ★'
  },
  {
    id: 'sup_004',
    name: 'Jiangsu Structural Steel & Profiles Corp',
    province: 'Jiangsu (Wuxi / Nanjing)',
    categories: ['Vigas de Aço', 'Estruturas Metálicas', 'Painéis Sandwich'],
    contactPerson: 'Mr. Wang Jun (Logística Internacional)',
    email: 'wang.jun@js-steel.example',
    wechat: 'JiangsuSteel_Trade',
    whatsapp: '+86 135 9912 3340',
    terms: 'FOB Shanghai',
    rating: '4.9 ★'
  }
];

// Fornecedor sugerido por categoria de produto
const SUPPLIER_BY_CATEGORY = {
  solar: 'sup_001',
  construction: 'sup_002',
  machinery: 'sup_003',
  industrial: 'sup_004'
};

const SHIPMENTS = [
  {
    code: 'SHP-2026-MAR-01',
    title: 'Lote Marítimo — Novembro',
    agentReference: 'AP-SEA-1105',
    status: 'INTERNATIONAL_TRANSIT',
    statusLabel: 'Enviado',
    transportMode: 'SEA',
    origin: 'Guangzhou (China)',
    departedAt: new Date('2026-11-05'),
    etaAt: new Date('2026-12-20'),
    volumeWeight: '184 m³ • 42.500 kg'
  },
  {
    code: 'SHP-2026-AIR-02',
    title: 'Lote Aéreo Expresso — Semana 45',
    agentReference: 'AP-AIR-0311',
    status: 'ARRIVED',
    statusLabel: 'Chegou a Angola',
    transportMode: 'AIR',
    origin: 'Shenzhen (China)',
    departedAt: new Date('2026-11-03'),
    etaAt: new Date('2026-11-09'),
    volumeWeight: '2.8 m³ • 640 kg'
  }
];

async function seedCatalog() {
  const categories = new Map();
  for (const p of PRODUCTS_DATA) {
    if (!categories.has(p.category)) categories.set(p.category, p.categoryLabel);
  }
  for (const [slug, name] of categories) {
    await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  }

  for (const s of SUPPLIERS) {
    await prisma.supplier.upsert({ where: { id: s.id }, update: s, create: s });
  }

  for (const p of PRODUCTS_DATA) {
    const category = await prisma.category.findUnique({ where: { slug: p.category } });
    const data = {
      title: p.title,
      slug: p.id,
      description: p.description,
      priceAoa: p.priceAoa,
      unit: p.unit || 'unidade',
      moq: p.moq,
      origin: p.origin,
      badge: p.badge,
      specs: p.specs,
      image: p.image,
      images: p.images || [],
      techSpecs: p.techSpecs || [],
      logistics: p.logistics || {},
      categoryId: category.id,
      supplierId: SUPPLIER_BY_CATEGORY[p.category] || null
    };
    // Mantém o mesmo id do frontend para os carrinhos já guardados continuarem válidos
    await prisma.product.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
  }
  console.info(`Catálogo: ${categories.size} categorias, ${PRODUCTS_DATA.length} produtos, ${SUPPLIERS.length} fornecedores.`);
}

async function seedShipments() {
  for (const s of SHIPMENTS) {
    await prisma.shipment.upsert({ where: { code: s.code }, update: s, create: s });
  }
}

async function seedDemoCustomer() {
  const email = process.env.SEED_DEMO_CUSTOMER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_DEMO_CUSTOMER_PASSWORD;
  if (!email || !password) {
    console.info('SEED_DEMO_CUSTOMER_* não definidos — conta demo não criada.');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('NODE_ENV=production — conta demo não criada.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'CUSTOMER',
      customer: {
        create: {
          firstName: 'Manuel',
          lastName: 'Dos Santos',
          phone: '+244 923 456 789',
          nif: '004928172LA041',
          addresses: {
            create: [
              {
                label: 'Escritório / Empresa',
                recipientName: 'Manuel Dos Santos',
                phone: '+244 923 456 789',
                province: 'Luanda',
                municipality: 'Talatona',
                street: 'Via S8, Edifício Sky One, 4º Andar, Sala 402',
                reference: 'Próximo ao Belas Shopping',
                isDefault: true
              }
            ]
          }
        }
      }
    }
  });
  console.info(`Conta cliente demo criada: ${email}`);
}

async function main() {
  await seedCatalog();
  await seedShipments();
  await seedDemoCustomer();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
