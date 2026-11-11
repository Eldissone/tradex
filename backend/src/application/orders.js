// Criação de encomendas: usada pela loja (API) e pelo assistente WhatsApp.
import { prisma } from '../infrastructure/database/prisma.js';
import { computeOrderCosts, getSetting } from '../infrastructure/settings.js';
import { ORDER_INCLUDE } from '../presentation/serializers.js';

export class OrderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function nextOrderNumber(tx) {
  const year = new Date().getFullYear();
  const prefix = `TDX-AO-${year}-`;
  const last = await tx.order.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true }
  });
  const seq = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * @param {object} input  dados já validados (items, customer, address, addressId, shippingMode, deliveryMethod, paymentMethod)
 * @param {object} ctx    { customer: registo Customer ou null, channel: 'WEB'|'WHATSAPP'|'ADMIN', conversationId }
 */
export async function createOrder(input, { customer = null, channel = 'WEB', conversationId = null } = {}) {
  const { enabledMethods } = await getSetting('payments');
  if (!enabledMethods.includes(input.paymentMethod)) {
    throw new OrderError('Método de pagamento indisponível de momento.');
  }

  // Preços sempre a partir da base de dados
  const ids = [...new Set(input.items.map(i => i.id))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
  if (products.length !== ids.length) {
    throw new OrderError('Um ou mais produtos do pedido já não estão disponíveis.');
  }
  const byId = new Map(products.map(p => [p.id, p]));

  // Agrupa linhas repetidas do mesmo produto
  const qty = new Map();
  for (const i of input.items) qty.set(i.id, (qty.get(i.id) || 0) + i.quantity);
  const lines = [...qty.entries()].map(([id, quantity]) => {
    const p = byId.get(id);
    return { productId: p.id, title: p.title, image: p.image, quantity, unitPriceAoa: Number(p.priceAoa) };
  });
  const subtotal = lines.reduce((acc, l) => acc + l.unitPriceAoa * l.quantity, 0);
  const costs = await computeOrderCosts({ subtotal, shippingMode: input.shippingMode, deliveryMethod: input.deliveryMethod });

  // Morada: guardada do cliente (com sessão) ou enviada no pedido
  let address = input.address || null;
  if (input.addressId && customer) {
    const saved = await prisma.address.findFirst({ where: { id: input.addressId, customerId: customer.id } });
    if (saved) {
      address = {
        label: saved.label, recipientName: saved.recipientName, phone: saved.phone,
        province: saved.province, municipality: saved.municipality, street: saved.street, reference: saved.reference
      };
    }
  }
  if (input.deliveryMethod !== 'pickup' && (!address?.street || !address?.municipality)) {
    throw new OrderError('Indique a morada de entrega.');
  }

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        number,
        channel,
        conversationId,
        customerId: customer?.id || null,
        isGuest: !customer,
        customerName: input.customer.name,
        customerEmail: input.customer.email,
        customerPhone: input.customer.phone,
        customerNif: input.customer.nif || null,
        shippingMode: costs.modeKey,
        deliveryMethod: input.deliveryMethod,
        deliveryAddress: address,
        subtotalAoa: subtotal,
        freightAoa: costs.freight,
        insuranceAoa: costs.insurance,
        deliveryFeeAoa: costs.deliveryFee,
        totalAoa: costs.total,
        estimatedDelivery: costs.transitLabel,
        items: { create: lines },
        payments: {
          create: {
            method: input.paymentMethod,
            provider: input.paymentMethod === 'bank_transfer' ? 'BANK' : 'EMIS',
            amountAoa: costs.total,
            status: 'PENDING'
          }
        },
        trackingEvents: {
          create: {
            status: 'AWAITING_PAYMENT',
            label: 'Encomenda Registada',
            note: `Encomenda registada${channel === 'WHATSAPP' ? ' pelo WhatsApp' : ''}. Aguardando pagamento de ${costs.total.toLocaleString('pt-AO')} Kz.`,
            responsible: channel === 'WHATSAPP' ? 'Assistente WhatsApp TradeX' : 'Sistema TradeX'
          }
        }
      },
      include: ORDER_INCLUDE
    });
  });

  // O carrinho guardado do cliente fica vazio depois da compra
  if (customer) {
    await prisma.cartItem.deleteMany({ where: { cart: { customerId: customer.id } } });
  }

  return order;
}
