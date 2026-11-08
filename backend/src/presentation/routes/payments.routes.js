import { Router } from 'express';

export const paymentsRouter = Router();

// Base de dados inicial de pagamentos para conciliação
const MOCK_PAYMENTS = [
  {
    id: 'pay_001',
    orderNumber: 'TDX-AO-2026-001',
    amountAoa: 3890040,
    method: 'mcx_express',
    methodName: 'Multicaixa Express',
    status: 'APPROVED',
    transactionId: 'MCX-TXN-2026-981024',
    date: '2026-11-02T14:38:12Z'
  },
  {
    id: 'pay_003',
    orderNumber: 'TDX-AO-2026-003',
    amountAoa: 1684800,
    method: 'mcx_reference',
    methodName: 'Referência Multicaixa',
    status: 'APPROVED',
    transactionId: 'ATM-GPO-2026-449102',
    date: '2026-10-12T09:40:00Z'
  }
];

// Listagem de transações financeiras
paymentsRouter.get('/history', (req, res) => {
  return res.json({ ok: true, total: MOCK_PAYMENTS.length, data: MOCK_PAYMENTS });
});

// Iniciação de Multicaixa Express
paymentsRouter.post('/mcx-express', (req, res) => {
  const { orderNumber, phone, amountAoa } = req.body;
  if (!orderNumber || !phone || !amountAoa) {
    return res.status(400).json({ ok: false, message: 'Dados incompletos para transação Multicaixa Express.' });
  }

  const txId = `MCX-REQ-${Date.now().toString().slice(-6)}`;

  const newPayment = {
    id: `pay_${Date.now()}`,
    orderNumber,
    amountAoa: Number(amountAoa),
    method: 'mcx_express',
    methodName: 'Multicaixa Express',
    status: 'PENDING',
    transactionId: txId,
    phone,
    date: new Date().toISOString()
  };

  MOCK_PAYMENTS.unshift(newPayment);

  return res.status(202).json({
    ok: true,
    message: `Solicitação enviada para o aplicativo Multicaixa Express (${phone}). Aguardando aprovação do PIN.`,
    transactionId: txId,
    expiresInSeconds: 900
  });
});

// Webhook da Gateway EMIS / Multicaixa
paymentsRouter.post('/webhook', (req, res) => {
  const { orderNumber, transactionId, status, secretToken } = req.body;

  if (!orderNumber || !status) {
    return res.status(400).json({ ok: false, message: 'Formato de webhook inválido.' });
  }

  const existing = MOCK_PAYMENTS.find(p => p.orderNumber === orderNumber);
  if (existing) {
    existing.status = status === 'APPROVED' || status === 'SUCCESS' ? 'APPROVED' : 'DECLINED';
    if (transactionId) existing.transactionId = transactionId;
  }

  return res.json({
    ok: true,
    message: 'Webhook recebido e transação conciliada com sucesso.',
    orderNumber,
    status: existing ? existing.status : status
  });
});

// Conciliação manual pelo operador de tesouraria
paymentsRouter.post('/reconcile', (req, res) => {
  const { paymentId, approved } = req.body;
  const p = MOCK_PAYMENTS.find(item => item.id === paymentId);

  if (!p) {
    return res.status(404).json({ ok: false, message: 'Registo de pagamento não encontrado.' });
  }

  p.status = approved ? 'APPROVED' : 'DECLINED';
  p.transactionId = `MANUAL-REC-${Date.now().toString().slice(-6)}`;

  return res.json({ ok: true, data: p });
});

