import { Router } from 'express';

export const adminRouter = Router();

// Fornecedores Homologados
const SUPPLIERS = [
  {
    id: 'sup_001',
    name: 'Guangdong SolarTech Industrial Co.',
    province: 'Guangdong (Foshan / Guangzhou)',
    categories: ['Energia Solar', 'Baterias Lítio', 'Inversores'],
    contactPerson: 'Mr. Zhang Wei',
    wechat: 'SolarTech_Export_CN',
    whatsapp: '+86 138 2910 4421',
    terms: 'FOB Nansha / CIF Luanda',
    rating: '5.0 ★'
  },
  {
    id: 'sup_002',
    name: 'Foshan Ceramic & Building Materials Co.',
    province: 'Guangdong (Foshan)',
    categories: ['Porcelanato', 'Revestimentos'],
    contactPerson: 'Ms. Lin Chen',
    wechat: 'FoshanCeramics_Lin',
    whatsapp: '+86 139 4482 1190',
    terms: 'FOB Huangpu',
    rating: '4.9 ★'
  }
];

// Remessas
const SHIPMENTS = [
  {
    id: 'SHP-2026-MAR-01',
    mode: 'Marítimo LCL Consolidado',
    vessel: 'Navio MSC Luanda (Viagem CN-AO 4402)',
    blNumber: 'MSCLU-8839201-AO',
    origin: 'Porto de Nansha, Guangzhou',
    destination: 'Porto de Luanda',
    status: 'Em Trânsito Marítimo',
    eta: '18 Nov 2026'
  }
];

// Métricas de Analytics
adminRouter.get('/analytics', (req, res) => {
  return res.json({
    ok: true,
    data: {
      totalRevenueAoa: 125800000,
      activeOrders: 18,
      inTransitCargoCount: 6,
      agtClearanceRate: '98.4%',
      categoriesBreakdown: [
        { category: 'Energia Solar', revenueAoa: 42500000 },
        { category: 'Construção & Equipamento', revenueAoa: 28200000 },
        { category: 'Maquinaria & Geradores', revenueAoa: 35000000 },
        { category: 'Eletrónicos & Iluminação', revenueAoa: 19800000 }
      ]
    }
  });
});

// Fornecedores
adminRouter.get('/suppliers', (req, res) => {
  return res.json({ ok: true, total: SUPPLIERS.length, data: SUPPLIERS });
});

// Remessas
adminRouter.get('/shipments', (req, res) => {
  return res.json({ ok: true, total: SHIPMENTS.length, data: SHIPMENTS });
});

// Disparo de Notificações Multicanal
adminRouter.post('/notifications/send', (req, res) => {
  const { orderNumber, channel, template, customerPhone, customerEmail } = req.body;

  return res.json({
    ok: true,
    message: `Notificação disparada com sucesso para ${customerPhone || customerEmail || 'Cliente'} via ${channel || 'WhatsApp API'}.`,
    channel,
    timestamp: new Date().toISOString()
  });
});

