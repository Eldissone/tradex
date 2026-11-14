// Ferramentas do assistente WhatsApp. Cada uma devolve texto (JSON) para o modelo.
// Regra de segurança: o assistente só vê dados de encomendas cujo telefone corresponde
// ao número que está a escrever (ou com o e-mail da compra indicado pelo cliente).
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { getSetting } from '../settings.js';
import { ORDER_STATUS_LABELS } from '../../presentation/serializers.js';
import { createOrder, OrderError } from '../../application/orders.js';
import { normalizePhone } from '../notifications/whatsapp.js';
import { notifyOrderEvent } from '../notifications/index.js';

const kz = (v) => `${Number(v || 0).toLocaleString('pt-AO')} Kz`;

// Definições enviadas à API (strict: os argumentos respeitam sempre o esquema)
export const ASSISTANT_TOOLS = [
  {
    name: 'search_products',
    description: 'Procura produtos activos no catálogo TradeX. Use antes de falar de preços, disponibilidade ou de criar uma encomenda. Devolve id, título, categoria, preço em Kwanzas, unidade e quantidade mínima.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Palavras a procurar no título/especificações. Vazio para listar.' },
        category: { type: 'string', enum: ['', 'solar', 'industrial', 'construction', 'machinery', 'electronics'], description: 'Categoria, ou vazio para todas.' }
      },
      required: ['query', 'category'],
      additionalProperties: false
    }
  },
  {
    name: 'get_order_status',
    description: 'Consulta o estado de uma encomenda pelo número (ex.: TDX-AO-2026-0001). Só devolve dados se o telefone desta conversa for o da encomenda ou se o cliente indicar o e-mail usado na compra.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        order_number: { type: 'string' },
        email: { type: 'string', description: 'E-mail usado na compra, se o cliente o indicou. Vazio caso contrário.' }
      },
      required: ['order_number', 'email'],
      additionalProperties: false
    }
  },
  {
    name: 'list_my_orders',
    description: 'Lista as encomendas feitas com o número de telefone desta conversa.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false }
  },
  {
    name: 'get_shipping_and_payment_info',
    description: 'Prazos de envio (marítimo/aéreo), percentagens de frete e seguro, taxas de entrega em Angola, levantamento no terminal e dados bancários para transferência.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false }
  },
  {
    name: 'create_order',
    description: 'Cria a encomenda. Use SÓ depois de o cliente confirmar explicitamente os produtos, quantidades, modalidade de envio, forma de entrega e o total que lhe mostrou. O pagamento é por transferência bancária.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { product_id: { type: 'string' }, quantity: { type: 'integer' } },
            required: ['product_id', 'quantity'],
            additionalProperties: false
          }
        },
        customer_name: { type: 'string' },
        email: { type: 'string', description: 'E-mail do cliente (obrigatório para receber a fatura).' },
        shipping_mode: { type: 'string', enum: ['sea_lcl', 'air_exp'] },
        delivery_method: { type: 'string', enum: ['pickup', 'delivery_luanda', 'delivery_interprovincial'] },
        address: {
          type: 'object',
          description: 'Morada de entrega. Para levantamento no terminal, envie campos vazios.',
          properties: {
            province: { type: 'string' },
            municipality: { type: 'string' },
            street: { type: 'string' },
            reference: { type: 'string' }
          },
          required: ['province', 'municipality', 'street', 'reference'],
          additionalProperties: false
        }
      },
      required: ['items', 'customer_name', 'email', 'shipping_mode', 'delivery_method', 'address'],
      additionalProperties: false
    }
  },
  {
    name: 'request_human',
    description: 'Passa a conversa para a equipa TradeX. Use quando o cliente pedir uma pessoa, reclamar, pedir reembolso/alteração de encomenda, cotação de produto fora do catálogo, ou quando não souber responder com segurança.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'Resumo curto do motivo, para a equipa.' } },
      required: ['reason'],
      additionalProperties: false
    }
  }
];

const json = (v) => JSON.stringify(v);

function orderSummary(o) {
  const payment = o.payments?.[0];
  return {
    number: o.number,
    status: ORDER_STATUS_LABELS[o.status] || o.status,
    created_at: o.createdAt.toISOString().slice(0, 10),
    total: kz(o.totalAoa),
    shipping: o.shippingMode === 'air_exp' ? 'Aéreo' : 'Marítimo',
    delivery: o.deliveryMethod === 'pickup' ? 'Levantamento no Terminal TradeX' : 'Entrega ao domicílio',
    estimated_delivery: o.estimatedDelivery,
    payment_status: payment?.status || null,
    payment_rejection_reason: payment?.status === 'DECLINED' ? payment.rejectionReason : null,
    items: o.items?.map(i => `${i.quantity} x ${i.title}`)
  };
}

const handlers = {
  async search_products({ query, category }) {
    const where = {
      active: true,
      ...(category ? { category: { slug: category } } : {}),
      ...(query ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { specs: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      } : {})
    };
    const products = await prisma.product.findMany({ where, take: 8, include: { category: true }, orderBy: { createdAt: 'asc' } });
    return json(products.map(p => ({
      id: p.id, title: p.title, category: p.category?.name, price: kz(p.priceAoa), price_aoa: Number(p.priceAoa),
      unit: p.unit, min_order: p.moq, specs: p.specs
    })));
  },

  async get_order_status({ order_number, email }, ctx) {
    const order = await prisma.order.findUnique({
      where: { number: order_number.trim().toUpperCase() },
      include: { items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    const phoneMatches = order && normalizePhone(order.customerPhone) === ctx.phone;
    const emailMatches = order && email && order.customerEmail === email.trim().toLowerCase();
    if (!order || (!phoneMatches && !emailMatches)) {
      return json({ found: false, hint: 'Não encontrada para este número. Peça o e-mail usado na compra para confirmar.' });
    }
    return json({ found: true, order: orderSummary(order) });
  },

  async list_my_orders(_input, ctx) {
    const orders = await prisma.order.findMany({
      where: { customerPhone: { contains: ctx.phone.slice(-9) } },
      include: { items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    // Confirma o número completo (o filtro acima usa os últimos 9 dígitos)
    return json(orders.filter(o => normalizePhone(o.customerPhone) === ctx.phone).map(orderSummary));
  },

  async get_shipping_and_payment_info() {
    const [shipping, bank] = await Promise.all([getSetting('shipping'), getSetting('bank')]);
    return json({
      modes: Object.entries(shipping.modes).map(([key, m]) => ({
        key, name: m.longLabel, days: `${m.minDays} a ${m.maxDays} dias`, freight_percent: Math.round(m.freightRate * 1000) / 10
      })),
      cargo_insurance_percent: Math.round(shipping.cargoInsuranceRate * 1000) / 10,
      delivery: Object.entries(shipping.deliveryMethods).map(([key, d]) => ({ key, name: d.label, fee: d.feeAoa ? kz(d.feeAoa) : 'Gratuito' })),
      pickup_address: 'Terminal TradeX, Kilamba, Luanda',
      payment: 'Transferência bancária; o cliente envia o comprovativo pelo link de rastreio.',
      bank_accounts: bank.accounts,
      account_holder: bank.accountHolder
    });
  },

  async create_order(input, ctx) {
    const email = z.string().trim().toLowerCase().email().safeParse(input.email);
    if (!email.success) return json({ ok: false, error: 'E-mail inválido. Peça um e-mail válido ao cliente.' });
    if (!input.items.length || input.items.some(i => !(i.quantity > 0))) {
      return json({ ok: false, error: 'Indique pelo menos um produto com quantidade positiva.' });
    }

    const pickup = input.delivery_method === 'pickup';
    try {
      const order = await createOrder({
        items: input.items.map(i => ({ id: i.product_id, quantity: i.quantity })),
        customer: { name: input.customer_name.trim() || ctx.profileName || 'Cliente WhatsApp', email: email.data, phone: `+${ctx.phone}` },
        address: pickup ? null : { ...input.address, recipientName: input.customer_name, phone: `+${ctx.phone}` },
        shippingMode: input.shipping_mode,
        deliveryMethod: input.delivery_method,
        paymentMethod: 'bank_transfer'
      }, { channel: 'WHATSAPP', conversationId: ctx.conversationId });

      notifyOrderEvent(order.id, 'order_created');
      const bank = await getSetting('bank');
      return json({
        ok: true,
        order_number: order.number,
        total: kz(order.totalAoa),
        breakdown: { products: kz(order.subtotalAoa), freight: kz(order.freightAoa), insurance: kz(order.insuranceAoa), delivery: kz(order.deliveryFeeAoa) },
        bank_accounts: bank.accounts,
        tracking_link_note: 'O cliente recebe por e-mail o link para acompanhar e enviar o comprovativo.'
      });
    } catch (err) {
      if (err instanceof OrderError) return json({ ok: false, error: err.message });
      throw err;
    }
  },

  async request_human({ reason }, ctx) {
    ctx.handoff = reason || 'Pedido de atendimento humano';
    return json({ ok: true, note: 'A equipa foi avisada. Diga ao cliente que uma pessoa responde em breve.' });
  }
};

export async function runAssistantTool(name, input, ctx) {
  const handler = handlers[name];
  if (!handler) return { content: json({ error: `Ferramenta desconhecida: ${name}` }), isError: true };
  try {
    return { content: await handler(input || {}, ctx), isError: false };
  } catch (err) {
    console.error(`[Assistente] Erro na ferramenta ${name}:`, err);
    return { content: json({ error: 'Erro interno ao executar a ferramenta.' }), isError: true };
  }
}
