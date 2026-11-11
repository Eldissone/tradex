// Converte registos Prisma para o formato que o frontend já consome.
import { getShippingMode } from '../config/shipping.js';

const num = (d) => (d == null ? 0 : Number(d));

export const ORDER_STATUS_LABELS = {
  AWAITING_PAYMENT: 'Aguardando Pagamento',
  PAYMENT_CONFIRMED: 'Pagamento Confirmado',
  PROCESSING_SUPPLIER: 'Em Processamento (compra na China)',
  IN_INTERNATIONAL_TRANSIT: 'Enviado (aéreo/marítimo)',
  ARRIVED_IN_ANGOLA: 'Chegou a Angola',
  READY_FOR_PICKUP: 'Pronto para Levantamento no Terminal',
  OUT_FOR_DELIVERY: 'Em Entrega ao Domicílio',
  DELIVERED: 'Entregue',
  CANCELLED: 'Encomenda Cancelada',
  RETURNED: 'Devolvida'
};

export const PAYMENT_METHOD_NAMES = {
  bank_transfer: 'Transferência Bancária',
  mcx_express: 'Multicaixa Express (MCX)',
  mcx_reference: 'Referência Multicaixa'
};

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.customer?.firstName || '',
    lastName: user.customer?.lastName || '',
    phone: user.customer?.phone || '',
    nif: user.customer?.nif || '',
    createdAt: user.createdAt
  };
}

export function serializeAddress(a) {
  return {
    id: a.id,
    label: a.label,
    recipientName: a.recipientName,
    phone: a.phone,
    province: a.province,
    municipality: a.municipality,
    street: a.street,
    reference: a.reference,
    isDefault: a.isDefault
  };
}

export function serializeProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    category: p.category?.slug || null,
    categoryLabel: p.category?.name || null,
    title: p.title,
    description: p.description,
    origin: p.origin,
    badge: p.badge,
    moq: p.moq,
    priceAoa: num(p.priceAoa),
    unit: p.unit,
    image: p.image,
    images: p.images || [],
    specs: p.specs,
    techSpecs: p.techSpecs || [],
    logistics: p.logistics || {},
    active: p.active,
    featured: p.featured,
    supplierId: p.supplierId
  };
}

export function serializePayment(pay, order) {
  return {
    id: pay.id,
    orderNumber: order?.number || pay.order?.number,
    amountAoa: num(pay.amountAoa),
    method: pay.method,
    methodName: PAYMENT_METHOD_NAMES[pay.method] || pay.method,
    status: pay.status,
    transactionId: pay.transactionId,
    reference: pay.reference,
    reviewedBy: pay.reviewedBy,
    reviewedAt: pay.reviewedAt,
    rejectionReason: pay.rejectionReason,
    hasProof: Boolean(pay.proofPath),
    proofFileName: pay.proofFileName,
    proofUploadedAt: pay.proofUploadedAt,
    customerName: pay.order?.customerName,
    date: pay.createdAt
  };
}

export function serializeOrder(o) {
  const payment = [...(o.payments || [])].sort((a, b) => b.createdAt - a.createdAt)[0];
  const mode = getShippingMode(o.shippingMode);
  const address = o.deliveryAddress || null;

  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status] || o.status,
    isGuest: o.isGuest,
    shipmentCode: o.shipment?.code || null,
    shipmentTitle: o.shipment?.title || null,
    customer: {
      id: o.customerId,
      name: o.customerName,
      email: o.customerEmail,
      phone: o.customerPhone,
      nif: o.customerNif
    },
    items: (o.items || []).map(i => ({
      id: i.productId,
      title: i.title,
      priceAoa: num(i.unitPriceAoa),
      quantity: i.quantity,
      subtotal: num(i.unitPriceAoa) * i.quantity,
      image: i.image
    })),
    financial: {
      subtotalAoa: num(o.subtotalAoa),
      internationalFreightAoa: num(o.freightAoa),
      customsInsuranceAoa: num(o.insuranceAoa),
      deliveryCostAoa: num(o.deliveryFeeAoa),
      totalAoa: num(o.totalAoa)
    },
    logistics: {
      shippingModeKey: o.shippingMode,
      shippingMode: mode.longLabel,
      deliveryMethod: o.deliveryMethod,
      origin: 'Guangzhou (China)',
      destination: `${address?.municipality || 'Luanda'}, Angola`,
      address,
      estimatedDeliveryDays: o.estimatedDelivery
    },
    payment: payment
      ? {
          id: payment.id,
          method: payment.method,
          methodName: PAYMENT_METHOD_NAMES[payment.method] || payment.method,
          status: payment.status,
          transactionId: payment.transactionId,
          reference: payment.reference,
          phone: payment.phone,
          hasProof: Boolean(payment.proofPath),
          proofFileName: payment.proofFileName,
          proofUploadedAt: payment.proofUploadedAt,
          rejectionReason: payment.rejectionReason
        }
      : null,
    history: [...(o.trackingEvents || [])]
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .map(e => ({
        status: e.status,
        label: e.label,
        date: e.occurredAt,
        note: e.note,
        responsible: e.responsible,
        location: e.location
      }))
  };
}

export const ORDER_INCLUDE = {
  items: true,
  payments: true,
  trackingEvents: true,
  shipment: { select: { code: true, title: true } }
};
