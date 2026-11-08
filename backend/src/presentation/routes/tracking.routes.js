import { Router } from 'express';

export const trackingRouter = Router();

const TRACKING_DB = {
  'TDX-AO-2026-001': {
    code: 'TDX-AO-2026-001',
    mode: 'Marítimo LCL (Carga Consolidada)',
    modeType: 'sea',
    status: 'Em Trânsito Marítimo Internacional',
    statusClass: 'status-transit',
    progress: 68,
    carrier: 'MSC Mediterranean Shipping Co. (Navio MSC Luanda)',
    voyage: 'CN-AO 4402',
    container: 'TGHU-984210-4 (Palete 03/08)',
    blNumber: 'MSCLU-8839201-AO',
    origin: 'Porto de Nansha, Guangzhou (China)',
    destination: 'Porto de Luanda, Terminal Multiusos (Angola)',
    finalDelivery: 'Armazém TradeX Bairro Azul, Luanda',
    departureDate: '05 de Novembro de 2026',
    estimatedArrival: '18 de Novembro de 2026',
    volumeWeight: '3.8 m³ • 1.250 kg (4 paletes)',
    declaredValue: '8.450.000 Kz',
    lastUpdate: 'Hoje, 09:40',
    currentLocation: 'Oceano Índico • Rumo a Cabo da Boa Esperança',
    milestones: [
      { step: 1, label: 'Ordem & Coleta', done: true },
      { step: 2, label: 'Despacho China', done: true },
      { step: 3, label: 'Em Trânsito Marítimo', active: true },
      { step: 4, label: 'Desalfandegamento Luanda', pending: true },
      { step: 5, label: 'Pronto p/ Entrega', pending: true }
    ],
    timeline: [
      {
        date: '07 Nov 2026 • 09:30',
        title: 'Em Trânsito Marítimo Internacional',
        location: 'Coordenadas: 24°18\'S 39°45\'E (Oceano Índico)',
        detail: 'Embarcação MSC Luanda em navegação contínua com velocidade de cruzeiro de 18.5 nós.',
        badge: 'Em Curso',
        badgeClass: 'badge-transit'
      },
      {
        date: '05 Nov 2026 • 18:45',
        title: 'Embarque Concluído e Saída do Porto de Nansha',
        location: 'Porto de Nansha, Guangzhou, China',
        detail: 'Contentor TGHU-984210-4 estivado a bordo no porão 4B. Conhecimento de Embarque Marítimo (Bill of Lading) emitido.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      }
    ],
    documents: [
      { name: 'Bill of Lading (B/L Internacional)', code: 'MSCLU-8839201-AO', status: 'Emitido & Autenticado' },
      { name: 'DU (Documento Único Provisório AGT)', code: 'DU-AO-2026-99321', status: 'Submetido Eletronicamente' },
      { name: 'Certificado de Conformidade (ARSEG/CRF)', code: 'CRF-CN-2026-0441', status: 'Aprovado' },
      { name: 'Seguro de Carga Marítima All Risks', code: 'POL-TDX-SEG-9912', status: 'Ativo (110% CIF Cobertura)' }
    ]
  }
};

// Consulta de rastreamento de carga
trackingRouter.get('/:code', (req, res) => {
  const { code } = req.params;
  const clean = code.trim().toUpperCase();

  const found = TRACKING_DB[clean];
  if (found) {
    return res.json({ ok: true, data: found });
  }

  // Gera dados simulados caso a encomenda seja recém-criada
  const dynamic = {
    code: clean,
    mode: 'Marítimo LCL Consolidado',
    modeType: 'sea',
    status: 'Em Processamento Logístico e Trânsito',
    statusClass: 'status-transit',
    progress: 45,
    carrier: 'MSC Mediterranean Shipping Co. / TradeX Global',
    voyage: 'CN-AO 4402',
    container: 'TDXU-882194-0',
    blNumber: `BL-${clean.replace(/[^A-Z0-9]/g, '')}`,
    origin: 'Hub Consolidado Yiwu / Guangzhou (China)',
    destination: 'Porto de Luanda (Angola)',
    finalDelivery: 'Terminal Logístico TradeX Luanda',
    departureDate: 'Em agendamento pós-despacho',
    estimatedArrival: '35 a 45 dias',
    volumeWeight: 'Carga Segurada',
    declaredValue: 'Fatura Pró-forma Emitida',
    lastUpdate: 'Atualizado em tempo real pelo sistema',
    currentLocation: 'Hub Central TradeX, Guangzhou, China',
    milestones: [
      { step: 1, label: 'Ordem Registada', done: true },
      { step: 2, label: 'Confirmação Pagamento', done: true },
      { step: 3, label: 'Compra & Recepção China', active: true },
      { step: 4, label: 'Trânsito Internacional', pending: true },
      { step: 5, label: 'Entrega em Luanda', pending: true }
    ],
    timeline: [
      {
        date: 'Hoje',
        title: 'Mercadoria em Processamento no Hub de Guangzhou',
        location: 'Guangzhou, China',
        detail: `Registo oficial da carga ${clean} em curso no terminal consolidado da TradeX.`,
        badge: 'Em Curso',
        badgeClass: 'badge-transit'
      }
    ],
    documents: [
      { name: 'Fatura Pró-forma da Encomenda', code: clean, status: 'Emitida em Kwanzas' },
      { name: 'Apólice de Seguro de Carga (110% CIF)', code: `POL-${clean}`, status: 'Cobertura Integral Ativa' }
    ]
  };

  return res.json({ ok: true, data: dynamic });
});

