import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma.js';

export const ordersRouter = Router();

// Base de encomendas inicial
const MOCK_ORDERS = [
  {
    id: 'ord_demo_001',
    number: 'TDX-AO-2026-001',
    createdAt: '2026-11-02T14:30:00Z',
    status: 'IN_TRANSIT',
    statusLabel: 'Em Trânsito Marítimo Internacional',
    customer: {
      name: 'Manuel Dos Santos',
      email: 'cliente@tradex.ao',
      phone: '+244 923 456 789',
      nif: '004928172LA041'
    },
    items: [
      {
        id: 'prod-01',
        title: 'Kit Painéis Solares Monocristalinos 550W (Palete com 30 un.)',
        priceAoa: 3450000,
        quantity: 1,
        subtotal: 3450000,
        image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=300'
      }
    ],
    financial: {
      subtotalAoa: 3450000,
      internationalFreightAoa: 276000,
      customsInsuranceAoa: 149040,
      deliveryCostAoa: 15000,
      totalAoa: 3890040
    },
    logistics: {
      shippingMode: 'Marítimo LCL Consolidado',
      deliveryMethod: 'delivery_luanda',
      origin: 'Porto de Nansha, Guangzhou (China)',
      destination: 'Luanda, Angola (Talatona)',
      carrier: 'MSC Mediterranean Shipping Co. (Navio MSC Luanda)',
      blNumber: 'MSCLU-8839201-AO',
      container: 'TGHU-984210-4',
      estimatedDeliveryDays: '18 de Novembro de 2026'
    },
    payment: {
      method: 'mcx_express',
      methodName: 'Multicaixa Express',
      status: 'APPROVED',
      transactionId: 'MCX-TXN-2026-981024',
      phone: '+244 923 456 789'
    },
    history: [
      {
        status: 'AWAITING_PAYMENT',
        label: 'Encomenda Registada',
        date: '2026-11-02T14:30:00Z',
        note: 'Encomenda submetida com sucesso.',
        responsible: 'Sistema TradeX'
      },
      {
        status: 'PAYMENT_CONFIRMED',
        label: 'Pagamento Confirmado em Kwanzas',
        date: '2026-11-02T14:38:12Z',
        note: 'Transação Multicaixa Express aprovada com sucesso.',
        responsible: 'Gateway EMIS / Multicaixa'
      },
      {
        status: 'IN_TRANSIT',
        label: 'Em Trânsito Internacional',
        date: '2026-11-05T18:45:00Z',
        note: 'Embarque efetuado no Porto de Nansha rumo a Luanda.',
        responsible: 'MSC Luanda'
      }
    ]
  }
];

// Lista de encomendas
ordersRouter.get('/', (req, res) => {
  const { status, email } = req.query;
  let list = [...MOCK_ORDERS];

  if (status && status !== 'all') {
    list = list.filter(o => o.status === status);
  }

  if (email) {
    list = list.filter(o => o.customer?.email?.toLowerCase() === email.toLowerCase());
  }

  return res.json({ ok: true, total: list.length, data: list });
});

// Detalhes da encomenda por código ou ID
ordersRouter.get('/:number', (req, res) => {
  const { number } = req.params;
  const clean = number.trim().toUpperCase();
  const order = MOCK_ORDERS.find(o => o.number === clean || o.id === number);

  if (!order) {
    return res.status(404).json({ ok: false, message: 'Encomenda não encontrada.' });
  }

  return res.json({ ok: true, data: order });
});

// Criação de nova encomenda de importação (Checkout)
ordersRouter.post('/', (req, res) => {
  const { items, customer, address, shippingMode, deliveryMethod, paymentMethod, mcxPhone } = req.body;

  if (!items || !items.length || !customer || !address) {
    return res.status(400).json({ ok: false, message: 'Dados insuficientes para gerar encomenda.' });
  }

  const subtotal = items.reduce((acc, i) => acc + (i.priceAoa * i.quantity), 0);
  const freightRate = shippingMode === 'air_exp' ? 0.18 : 0.08;
  const internationalFreight = Math.round(subtotal * freightRate);
  const customsInsurance = Math.round((subtotal + internationalFreight) * 0.04);
  
  let deliveryCost = 0;
  if (deliveryMethod === 'delivery_luanda') deliveryCost = 15000;
  else if (deliveryMethod === 'delivery_interprovincial') deliveryCost = 35000;

  const totalAoa = subtotal + internationalFreight + customsInsurance + deliveryCost;

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `TDX-AO-2026-${randomNum}`;

  const paymentNames = {
    mcx_express: 'Multicaixa Express (MCX)',
    mcx_reference: 'Referência Multicaixa',
    bank_transfer: 'Transferência Bancária Directa'
  };

  const newOrder = {
    id: `ord_${Date.now()}`,
    number: orderNumber,
    createdAt: new Date().toISOString(),
    status: 'AWAITING_PAYMENT',
    statusLabel: 'Aguardando Pagamento em Kwanzas',
    customer: {
      name: customer.name || 'Cliente TradeX',
      email: customer.email,
      phone: customer.phone,
      nif: customer.nif || null
    },
    items: items.map(i => ({
      id: i.id,
      title: i.title,
      priceAoa: i.priceAoa,
      quantity: i.quantity,
      subtotal: i.priceAoa * i.quantity,
      image: i.image || (i.images && i.images[0]?.url) || null
    })),
    financial: {
      subtotalAoa: subtotal,
      internationalFreightAoa: internationalFreight,
      customsInsuranceAoa: customsInsurance,
      deliveryCostAoa: deliveryCost,
      totalAoa: totalAoa
    },
    logistics: {
      shippingMode: shippingMode === 'air_exp' ? 'Aéreo Expresso Internacional' : 'Marítimo LCL Consolidado',
      deliveryMethod: deliveryMethod,
      origin: 'Hub Consolidado Yiwu / Guangzhou (China)',
      destination: `Luanda, Angola (${address.municipality || 'Luanda'})`,
      address: address,
      estimatedDeliveryDays: shippingMode === 'air_exp' ? '7 a 12 dias' : '35 a 45 dias'
    },
    payment: {
      method: paymentMethod || 'mcx_express',
      methodName: paymentNames[paymentMethod] || 'Multicaixa Express',
      status: 'PENDING',
      reference: paymentMethod === 'mcx_reference' ? `928 440 ${randomNum}` : null,
      entity: paymentMethod === 'mcx_reference' ? '00142' : null,
      phone: mcxPhone || customer.phone || null
    },
    history: [
      {
        status: 'AWAITING_PAYMENT',
        label: 'Encomenda Registada',
        date: new Date().toISOString(),
        note: `Encomenda oficial emitida. Aguardando pagamento no valor de ${totalAoa.toLocaleString('pt-AO')} Kz.`,
        responsible: 'Sistema TradeX'
      }
    ]
  };

  MOCK_ORDERS.unshift(newOrder);
  return res.status(201).json({ ok: true, data: newOrder });
});

// Atualização de estado da encomenda (Backoffice)
ordersRouter.patch('/:number/status', (req, res) => {
  const { number } = req.params;
  const { status, note, responsible } = req.body;

  const clean = number.trim().toUpperCase();
  const order = MOCK_ORDERS.find(o => o.number === clean || o.id === number);

  if (!order) {
    return res.status(404).json({ ok: false, message: 'Encomenda não encontrada.' });
  }

  const statusLabelsMap = {
    AWAITING_PAYMENT: 'Aguardando Pagamento em Kwanzas',
    PAYMENT_CONFIRMED: 'Pagamento Confirmado em Kwanzas',
    PROCESSING_SUPPLIER: 'Compra no Fornecedor na China',
    AWAITING_WAREHOUSE: 'Aguardando Recepção no Armazém',
    WAREHOUSE_RECEIVED: 'Mercadoria Recebida no Armazém China',
    READY_TO_SHIP: 'Preparada para Expedição & Lacre',
    IN_INTERNATIONAL_TRANSIT: 'Em Trânsito Marítimo/Aéreo Internacional',
    ARRIVED_IN_ANGOLA: 'Chegada a Angola (Porto/Aeroporto Luanda)',
    CUSTOMS_CLEARANCE: 'Em Desembaraço Aduaneiro AGT',
    OUT_FOR_DELIVERY: 'Em Distribuição / Pronto p/ Levantamento',
    DELIVERED: 'Carga Entregue com Sucesso',
    CANCELLED: 'Encomenda Cancelada'
  };

  order.status = status;
  order.statusLabel = statusLabelsMap[status] || status;

  if (status === 'PAYMENT_CONFIRMED' || status === 'PROCESSING_SUPPLIER') {
    order.payment.status = 'APPROVED';
  }

  order.history.unshift({
    status: status,
    label: order.statusLabel,
    date: new Date().toISOString(),
    note: note || `Estado atualizado para ${order.statusLabel}.`,
    responsible: responsible || 'Operador TradeX'
  });

  return res.json({ ok: true, data: order });
});

