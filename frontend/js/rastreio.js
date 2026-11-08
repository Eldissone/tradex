import { cartStore } from './cart.js';
import { authStore } from './auth.js';

// Base de dados rica de encomendas para demonstração
const TRACKING_DATABASE = {
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
    lastUpdate: 'Há 2 horas • 07 Nov 2026, 09:40',
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
        detail: 'Embarcação MSC Luanda em navegação contínua com velocidade de cruzeiro de 18.5 nós. Condições de tempo estáveis.',
        badge: 'Em Curso',
        badgeClass: 'badge-transit'
      },
      {
        date: '05 Nov 2026 • 18:45',
        title: 'Embarque Concluído e Saída do Porto de Nansha',
        location: 'Porto de Nansha, Guangzhou, China',
        detail: 'Contentor TGHU-984210-4 estivado a bordo no porão 4B. Conhecimento de Embarque Marítimo (Bill of Lading) emitido e liberado.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      },
      {
        date: '04 Nov 2026 • 14:10',
        title: 'Desembaraço Aduaneiro de Exportação',
        location: 'Alfândega de Huangpu / Guangzhou, China',
        detail: 'Declaração aduaneira de exportação Nº 51002026110408 desembaraçada com vistoria documental e selo fiscal emitido.',
        badge: 'Aprovado',
        badgeClass: 'badge-done'
      },
      {
        date: '03 Nov 2026 • 11:20',
        title: 'Inspeção Técnica de Qualidade & Paletização',
        location: 'Hub Central TradeX, Guangzhou, China',
        detail: 'Verificação física dos produtos, pesagem de precisão, empacotamento com cantoneiras de proteção e lacre inviolável TradeX TDX-SEC-882.',
        badge: 'Inspecionado',
        badgeClass: 'badge-done'
      },
      {
        date: '02 Nov 2026 • 15:00',
        title: 'Recepção de Mercadorias dos Fornecedores',
        location: 'Hub Logístico TradeX, Guangdong, China',
        detail: 'Lotes de equipamentos entregues pelo fabricante e conferidos conforme a fatura pró-forma da encomenda.',
        badge: 'Recebido',
        badgeClass: 'badge-done'
      }
    ],
    documents: [
      { name: 'Bill of Lading (B/L Internacional)', code: 'MSCLU-8839201-AO', status: 'Emitido & Autenticado' },
      { name: 'DU (Documento Único Provisório AGT)', code: 'DU-AO-2026-99321', status: 'Submetido Eletronicamente' },
      { name: 'Certificado de Conformidade (ARSEG/CRF)', code: 'CRF-CN-2026-0441', status: 'Aprovado' },
      { name: 'Seguro de Carga Marítima All Risks', code: 'POL-TDX-SEG-9912', status: 'Ativo (110% CIF Cobertura)' }
    ]
  },
  'TDX-AO-2026-002': {
    code: 'TDX-AO-2026-002',
    mode: 'Aéreo Expresso Internacional',
    modeType: 'air',
    status: 'Desalfandegamento Concluído em Luanda',
    statusClass: 'status-cleared',
    progress: 88,
    carrier: 'Ethiopian Cargo / TAAG (Voo ET-3752 / DT-581)',
    voyage: 'ET-DT-2026-AIR',
    container: 'ULD Palete Aérea AKE-4491-ET',
    blNumber: 'AWB 071-88492013',
    origin: 'Aeroporto Internacional Shenzhen Bao\'an (SZX), China',
    destination: 'Aeroporto Internacional 4 de Fevereiro (LAD), Luanda',
    finalDelivery: 'Entrega Corporativa Direta (Luanda)',
    departureDate: '03 de Novembro de 2026',
    estimatedArrival: '09 de Novembro de 2026',
    volumeWeight: '0.85 m³ • 240 kg (12 volumes)',
    declaredValue: '4.980.000 Kz',
    lastUpdate: 'Há 45 minutos • 07 Nov 2026, 10:30',
    currentLocation: 'Terminal de Carga Alfandegária, Luanda, Angola',
    milestones: [
      { step: 1, label: 'Ordem & Coleta', done: true },
      { step: 2, label: 'Despacho China', done: true },
      { step: 3, label: 'Voo Internacional', done: true },
      { step: 4, label: 'Desalfandegamento AGT', active: true },
      { step: 5, label: 'Pronto p/ Entrega', pending: true }
    ],
    timeline: [
      {
        date: '07 Nov 2026 • 10:15',
        title: 'Desalfandegamento Concluído pela AGT',
        location: 'Terminal de Cargas Aéreas, Luanda, Angola',
        detail: 'Pagamento de direitos e taxas alfandegárias liquidado. Nota de liquidação aduaneira Nº AGT-2026-44109 emitida.',
        badge: 'Liberado',
        badgeClass: 'badge-done'
      },
      {
        date: '06 Nov 2026 • 21:40',
        title: 'Aterragem e Descarregamento no Aeroporto 4 de Fevereiro',
        location: 'Aeroporto de Luanda (LAD), Angola',
        detail: 'Aeronave cargueira pousou sem ocorrências. Carga encaminhada para a zona de conferência aduaneira primária.',
        badge: 'Atracado',
        badgeClass: 'badge-done'
      },
      {
        date: '04 Nov 2026 • 08:30',
        title: 'Voo Internacional com Conexão Addis Ababa',
        location: 'Em Trânsito Aéreo (SZX ➔ ADD ➔ LAD)',
        detail: 'Conexão concluída com manifesto de carga aérea AWB 071-88492013.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      },
      {
        date: '03 Nov 2026 • 19:00',
        title: 'Despacho Expresso e Embarque Aéreo em Shenzhen',
        location: 'Aeroporto Internacional Shenzhen Bao\'an, China',
        detail: 'Inspeção de segurança de aviação civil concluída com selagem ULD.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      }
    ],
    documents: [
      { name: 'Air Waybill (AWB Internacional)', code: 'AWB 071-88492013', status: 'Emitido & Validado' },
      { name: 'Documento Único Definitivo AGT', code: 'DU-AGT-2026-0881', status: 'Liquidado & Desembaraçado' },
      { name: 'Certificado de Conformidade Técnica', code: 'CCT-SHZ-2026', status: 'Aprovado' },
      { name: 'Seguro Aéreo Expresso', code: 'AIR-TDX-SEG-4411', status: 'Ativo' }
    ]
  },
  'TDX-AO-2026-003': {
    code: 'TDX-AO-2026-003',
    mode: 'Marítimo FCL (Contentor Completo 40ft High Cube)',
    modeType: 'sea',
    status: 'Disponível para Levantamento no Terminal',
    statusClass: 'status-ready',
    progress: 100,
    carrier: 'Maersk Line (Navio Maersk Cotonou)',
    voyage: 'MSK-AO-2026-09',
    container: 'MSKU-741982-9 (Contentor Fechado 40ft HC)',
    blNumber: 'MAEU-992014-AO',
    origin: 'Porto de Ningbo-Zhoushan, Zhejiang (China)',
    destination: 'Porto de Luanda, Terminal de Contentores (Angola)',
    finalDelivery: 'Armazém Central TradeX, Bairro Azul, Luanda',
    departureDate: '15 de Outubro de 2026',
    estimatedArrival: '04 de Novembro de 2026',
    volumeWeight: '68 m³ • 22.800 kg (Contentor FCL)',
    declaredValue: '38.900.000 Kz',
    lastUpdate: 'Hoje • 07 Nov 2026, 08:00',
    currentLocation: 'Terminal TradeX, Bairro Azul, Luanda, Angola',
    milestones: [
      { step: 1, label: 'Ordem & Coleta', done: true },
      { step: 2, label: 'Despacho China', done: true },
      { step: 3, label: 'Em Trânsito Marítimo', done: true },
      { step: 4, label: 'Desalfandegamento Luanda', done: true },
      { step: 5, label: 'Pronto p/ Levantamento', active: true, done: true }
    ],
    timeline: [
      {
        date: '06 Nov 2026 • 16:30',
        title: 'Carga Descarregada e Pronta no Terminal TradeX',
        location: 'Armazém Central TradeX, Bairro Azul, Luanda',
        detail: 'Contentor conferido e desovado. Mercadoria pronta para levantamento pelo cliente ou despacho com frota local.',
        badge: 'Disponível',
        badgeClass: 'badge-ready'
      },
      {
        date: '05 Nov 2026 • 11:00',
        title: 'Desembaraço Concluído e Saída do Porto de Luanda',
        location: 'Porto de Luanda, Terminal de Contentores',
        detail: 'Liberação aduaneira definitiva pela AGT e Capitania do Porto. Transporte rodoviário em camião porta-contentor executado.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      },
      {
        date: '04 Nov 2026 • 09:15',
        title: 'Atracação e Desembarque no Cais de Luanda',
        location: 'Porto Comercial de Luanda, Cais 3',
        detail: 'Navio Maersk atracado. Descarga efetuada via pórtico STS sem avarias registadas.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      },
      {
        date: '15 Out 2026 • 14:00',
        title: 'Partida do Porto de Ningbo-Zhoushan',
        location: 'Ningbo, Zhejiang, China',
        detail: 'Contentor lacrado com selo de alta segurança ISO 17712 nº 992819.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      }
    ],
    documents: [
      { name: 'Original Bill of Lading (FCL)', code: 'MAEU-992014-AO', status: 'Quitado & Resgatado' },
      { name: 'Guia de Desembaraço AGT', code: 'AGT-DES-2026-9921', status: 'Totalmente Liquidada' },
      { name: 'Termo de Entrega de Contentor', code: 'TEC-TRADEX-AO-003', status: 'Emitido' },
      { name: 'Certificado de Vistoria de Selagem', code: 'CERT-ISO-17712', status: 'Conforme' }
    ]
  }
};

// Gerador dinâmico de detalhes plausíveis para qualquer outro código inserido
function generateDynamicShipment(code) {
  return {
    code: code,
    mode: 'Marítimo LCL (Carga Consolidada China ➔ Luanda)',
    modeType: 'sea',
    status: 'Em Processamento Logístico e Trânsito',
    statusClass: 'status-transit',
    progress: 55,
    carrier: 'TradeX Global Freight Partner (Embarcação Marítima Internacional)',
    voyage: 'TDX-VOY-2026',
    container: 'TDXU-882194-0',
    blNumber: `BL-${code.replace(/[^A-Z0-9]/g, '')}`,
    origin: 'Hub Consolidado Yiwu / Guangzhou (China)',
    destination: 'Porto de Luanda (Angola)',
    finalDelivery: 'Terminal TradeX, Luanda',
    departureDate: '01 de Novembro de 2026',
    estimatedArrival: '20 de Novembro de 2026',
    volumeWeight: '2.5 m³ • 820 kg',
    declaredValue: 'Sob Cotação',
    lastUpdate: 'Atualizado hoje às 10:15',
    currentLocation: 'Rota Internacional Sul • Rumo a Luanda',
    milestones: [
      { step: 1, label: 'Ordem & Coleta', done: true },
      { step: 2, label: 'Despacho China', done: true },
      { step: 3, label: 'Em Trânsito Internacional', active: true },
      { step: 4, label: 'Desalfandegamento Luanda', pending: true },
      { step: 5, label: 'Pronto p/ Entrega', pending: true }
    ],
    timeline: [
      {
        date: '07 Nov 2026 • 10:15',
        title: 'Em Trânsito Internacional com Monitorização Ativa',
        location: 'Rota Oceânica Internacional',
        detail: `Remessa com código ${code} em navegação normal. Todos os parâmetros de rastreamento confirmados.`,
        badge: 'Em Curso',
        badgeClass: 'badge-transit'
      },
      {
        date: '04 Nov 2026 • 16:30',
        title: 'Despacho e Liberação Aduaneira no Porto de Origem',
        location: 'Guangzhou Hub, China',
        detail: 'Documentos fiscais e packing list chancelados com selo de trânsito internacional.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      },
      {
        date: '01 Nov 2026 • 10:00',
        title: 'Recepção, Triagem e Paletização no Armazém TradeX',
        location: 'Armazém Central China',
        detail: 'Carga recebida do fornecedor, verificada e etiquetada com identificador TradeX.',
        badge: 'Concluído',
        badgeClass: 'badge-done'
      }
    ],
    documents: [
      { name: 'Conhecimento de Embarque Internacional', code: `BL-${code}`, status: 'Emitido' },
      { name: 'Documento Único Provisório AGT', code: `DU-AO-${code}`, status: 'Em Processamento' },
      { name: 'Seguro de Transporte Internacional', code: 'POL-TDX-ALLRISKS', status: 'Ativo' }
    ]
  };
}

// Renderização Completa dos Detalhes de Rastreio
function renderShipmentDetails(shipment) {
  const container = document.getElementById('trackingDashboard');
  if (!container) return;

  const modeSvg = shipment.modeType === 'air'
    ? `<svg class="track-mode-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"></path></svg>`
    : `<svg class="track-mode-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"></path><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"></path><path d="M12 10v4"></path><path d="M12 2v3"></path></svg>`;

  container.innerHTML = `
    <!-- Cartão Principal de Status -->
    <div class="track-status-hero">
      <div class="track-status-top">
        <div class="track-status-left">
          <div class="track-live-pill ${shipment.statusClass}">
            <span class="track-pulse-dot"></span>
            <span>${shipment.status}</span>
          </div>
          <span class="track-last-update">${shipment.lastUpdate}</span>
        </div>
        <div class="track-status-right">
          <button type="button" class="btn-copy-code" id="btnCopyTrackingCode" title="Copiar Código">
            <span>${shipment.code}</span>
            <svg class="track-copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="track-route-header">
        <div class="route-city-block">
          <span class="route-city-label">ORIGEM</span>
          <h3 class="route-city-name">${shipment.origin.split(',')[0]}</h3>
          <span class="route-subdetail">${shipment.origin}</span>
        </div>
        <div class="route-transit-graphic">
          <div class="route-mode-badge">${modeSvg} <span>${shipment.mode.split(' ')[0]}</span></div>
          <div class="route-track-line">
            <div class="route-track-fill"></div>
            <div class="route-track-vehicle">${modeSvg}</div>
          </div>
          <span class="route-progress-num">${shipment.progress}% Percorrido</span>
        </div>
        <div class="route-city-block route-city-dest">
          <span class="route-city-label">DESTINO FINAL</span>
          <h3 class="route-city-name">Luanda, Angola</h3>
          <span class="route-subdetail">${shipment.destination}</span>
        </div>
      </div>
    </div>

    <!-- Barra de Milestones (Etapas da Carga) -->
    <div class="track-milestones-card">
      <h3 class="track-card-title">Etapas da Operação Logística</h3>
      <div class="milestones-track">
        ${shipment.milestones.map((m, idx) => `
          <div class="milestone-item ${m.done ? 'milestone-done' : ''} ${m.active ? 'milestone-active' : ''}">
            <div class="milestone-indicator">
              ${m.done 
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
                : idx + 1}
            </div>
            <span class="milestone-label">${m.label}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Grid de Ficha Técnica da Carga -->
    <div class="track-meta-grid">
      <div class="track-meta-card">
        <span class="meta-card-label">Modalidade de Envio</span>
        <strong class="meta-card-value">${modeSvg} <span>${shipment.mode}</span></strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Transportador & Embarcação/Voo</span>
        <strong class="meta-card-value">${shipment.carrier}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Nº de Contentor / ULD</span>
        <strong class="meta-card-value">${shipment.container}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Conhecimento de Embarque (B/L ou AWB)</span>
        <strong class="meta-card-value">${shipment.blNumber}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Data de Embarque (ETD)</span>
        <strong class="meta-card-value">${shipment.departureDate}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Previsão de Chegada (ETA)</span>
        <strong class="meta-card-value meta-highlight">${shipment.estimatedArrival}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Volume & Peso Bruto</span>
        <strong class="meta-card-value">${shipment.volumeWeight}</strong>
      </div>
      <div class="track-meta-card">
        <span class="meta-card-label">Localização Atual Registada</span>
        <strong class="meta-card-value">${shipment.currentLocation}</strong>
      </div>
    </div>

    <!-- Colunas Principais: Timeline Detalhada + Documentação & Ações -->
    <div class="track-columns-split">
      <!-- Coluna da Timeline Cronológica -->
      <div class="track-column-timeline">
        <div class="track-section-heading">
          <h3 class="track-card-title">Histórico e Pontos de Verificação</h3>
          <span class="track-pill-counter">${shipment.timeline.length} eventos registados</span>
        </div>
        <ul class="track-detailed-timeline">
          ${shipment.timeline.map((ev, i) => `
            <li class="track-event-item ${i === 0 ? 'event-latest' : ''}">
              <div class="event-bullet-col">
                <div class="event-bullet-dot"></div>
                ${i !== shipment.timeline.length - 1 ? '<div class="event-line"></div>' : ''}
              </div>
              <div class="event-content-box">
                <div class="event-header-flex">
                  <span class="event-date-stamp">${ev.date}</span>
                  <span class="event-badge ${ev.badgeClass}">${ev.badge}</span>
                </div>
                <h4 class="event-title">${ev.title}</h4>
                <p class="event-location-text">
                  <svg class="event-pin-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>${ev.location}</span>
                </p>
                <p class="event-detail-text">${ev.detail}</p>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Coluna de Documentos e Suporte -->
      <div class="track-column-sidebar">
        <!-- Caixa de Documentos Aduaneiros -->
        <div class="track-sidebar-card">
          <h3 class="track-card-title">Documentos & Alfândega AGT</h3>
          <p class="sidebar-subtext">Processamento alfandegário e documentação oficial da carga emitida pela TradeX.</p>
          <div class="doc-list-group">
            ${shipment.documents.map(doc => `
              <div class="doc-item-row">
                <div class="doc-icon-wrap">
                  <svg class="doc-file-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <div class="doc-info-block">
                  <span class="doc-name">${doc.name}</span>
                  <span class="doc-code">${doc.code}</span>
                </div>
                <span class="doc-status-tag">${doc.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Caixa de Ações Rápidas -->
        <div class="track-sidebar-card card-support-action">
          <h3 class="track-card-title">Precisa de Ajuda ou Agendamento?</h3>
          <p class="sidebar-subtext">Acompanhe a sua carga pelo WhatsApp ou fale com o despachante oficial responsável por esta remessa.</p>
          <div class="support-action-buttons">
            <button type="button" class="btn-sidebar-action btn-print-tracking" id="btnPrintReport">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Imprimir Ficha de Rastreio</span>
            </button>
            <a href="https://wa.me/244900000000?text=Ol%C3%A1%20TradeX,%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20rastreio%20${shipment.code}" target="_blank" rel="noopener noreferrer" class="btn-sidebar-action btn-whatsapp-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <span>Acompanhar no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  container.classList.add('visible');

  // Configurar botão de copiar
  const copyBtn = document.getElementById('btnCopyTrackingCode');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard?.writeText(shipment.code);
    const span = copyBtn.querySelector('span');
    if (span) {
      const original = span.textContent;
      span.textContent = 'Copiado!';
      setTimeout(() => { span.textContent = original; }, 2000);
    }
  });

  // Configurar botão de impressão
  document.getElementById('btnPrintReport')?.addEventListener('click', () => {
    window.print();
  });
}

// Conversor de encomendas geradas pelo checkout para a visualização de rastreio
function convertOrderToShipment(order) {
  const isAir = order.logistics && order.logistics.shippingMode && order.logistics.shippingMode.includes('Aéreo');
  const isPending = order.payment && order.payment.status === 'PENDING';
  
  return {
    code: order.number,
    mode: order.logistics?.shippingMode || 'Marítimo LCL Consolidado',
    modeType: isAir ? 'air' : 'sea',
    status: isPending ? 'Aguardando Liquidação de Pagamento' : 'Em Processamento Logístico',
    statusClass: isPending ? 'status-pending' : 'status-transit',
    progress: isPending ? 18 : 45,
    carrier: isAir ? 'TAAG Linhas Aéreas / Ethiopian Cargo' : 'MSC Mediterranean Shipping Co. (Navio MSC Luanda)',
    voyage: isAir ? 'ET-AO-AIR-2026' : 'MSC-LUANDA-2026',
    container: 'TDX-CON-99214',
    blNumber: order.payment?.reference ? `REF-${order.payment.reference}` : `BL-${order.id}`,
    origin: order.logistics?.origin || 'Hub Consolidado Yiwu / Guangzhou (China)',
    destination: order.logistics?.destination || 'Luanda, Angola',
    finalDelivery: order.logistics?.address ? `${order.logistics.address.street}, ${order.logistics.address.municipality}` : 'Terminal TradeX, Luanda',
    departureDate: 'A ser agendado após confirmação de pagamento',
    estimatedArrival: order.logistics?.estimatedDeliveryDays || '35 a 45 dias',
    volumeWeight: `${order.items ? order.items.length : 1} produto(s) • Carga Segurada`,
    declaredValue: cartStore.formatAoa(order.financial?.totalAoa || 0),
    lastUpdate: 'Atualizado em tempo real pelo sistema TradeX',
    currentLocation: isPending ? 'Terminal de Origem • Aguardando Validação Financeira' : 'Hub Central TradeX, Guangzhou, China',
    milestones: [
      { step: 1, label: 'Ordem Registada', done: true },
      { step: 2, label: 'Confirmação Pagamento', active: isPending, done: !isPending },
      { step: 3, label: 'Compra & Recepção China', pending: isPending },
      { step: 4, label: 'Trânsito Internacional', pending: true },
      { step: 5, label: 'Entrega em Luanda', pending: true }
    ],
    timeline: (order.history && order.history.length > 0) ? order.history.map(h => ({
      date: new Date(h.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      title: h.label || 'Registo de Encomenda',
      location: order.logistics?.origin || 'Guangzhou Hub, China',
      detail: h.note || `Encomenda submetida com sucesso por ${order.customer?.name || 'Cliente'}.`,
      badge: h.status === 'AWAITING_PAYMENT' ? 'Aguardando' : 'Concluído',
      badgeClass: h.status === 'AWAITING_PAYMENT' ? 'badge-transit' : 'badge-done'
    })) : [
      {
        date: new Date(order.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        title: 'Encomenda Registada no Sistema',
        location: 'Luanda, Angola',
        detail: `Registo oficial efetuado. Aguardando confirmação do pagamento via ${order.payment?.methodName || 'Kwanza'}.`,
        badge: 'Registado',
        badgeClass: 'badge-transit'
      }
    ],
    documents: [
      { name: 'Fatura Pró-forma da Encomenda', code: order.number, status: 'Emitida em Kwanzas' },
      { name: 'Apólice de Seguro de Carga (110% CIF)', code: `POL-${order.number}`, status: 'Cobertura Integral Ativa' }
    ]
  };
}

// Inicialização da Página
function initTrackingPage() {
  const form = document.getElementById('trackingPageForm');
  const input = document.getElementById('trackingCodeInput');
  const chips = document.querySelectorAll('.tracking-quick-chip');

  function executeSearch(rawCode) {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    if (input) input.value = code;

    // Atualiza a URL sem recarregar a página
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('codigo', code);
    window.history.replaceState({}, '', newUrl.toString());

    // Procura na base pré-definida, depois nas encomendas locais salvas pelo checkout, ou gera dinâmico
    let shipment = TRACKING_DATABASE[code];
    if (!shipment) {
      const savedOrder = authStore.getOrderById(code);
      if (savedOrder) {
        shipment = convertOrderToShipment(savedOrder);
      } else {
        shipment = generateDynamicShipment(code);
      }
    }

    renderShipmentDetails(shipment);

    // Scroll suave até ao dashboard
    document.getElementById('trackingDashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input) executeSearch(input.value);
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const code = chip.getAttribute('data-code');
      if (code) executeSearch(code);
    });
  });

  // Verifica se há parâmetro ?codigo= na URL
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('codigo');

  if (codeParam) {
    executeSearch(codeParam);
  } else {
    // Carrega a primeira carga de demonstração por defeito
    executeSearch('TDX-AO-2026-001');
  }

  // Header sticky past-hero
  const header = document.getElementById('mainHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('past-hero');
      } else {
        header.classList.remove('past-hero');
      }
    }, { passive: true });
  }

  // Drawer do Carrinho
  setupCartDrawer();
  updateCartUi();
}

function updateCartUi() {
  const items = cartStore.getItems();
  const countEl = document.getElementById('cartCount');
  const listEl = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalAoa');

  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce((acc, item) => acc + (item.priceAoa * item.quantity), 0);

  if (countEl) countEl.textContent = totalQuantity;
  if (totalEl) totalEl.textContent = cartStore.formatAoa(totalAmount);

  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = `
      <li class="cart-empty-msg">
        O seu pedido está vazio. Selecione itens do catálogo abaixo.
      </li>
    `;
    return;
  }

  listEl.innerHTML = items.map((item, index) => `
    <li class="cart-item">
      <div class="cart-item-header">
        <span class="cart-item-title">${item.title}</span>
        <button class="cart-item-remove" data-remove-idx="${index}" aria-label="Remover">✕</button>
      </div>
      <div class="cart-item-footer">
        <span class="cart-item-qty">Qtd: ${item.quantity}</span>
        <span class="cart-item-price">${cartStore.formatAoa(item.priceAoa * item.quantity)}</span>
      </div>
    </li>
  `).join('');

  listEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
      cartStore.removeItem(idx);
      updateCartUi();
    });
  });
}

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('visible');
}

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('visible');
}

function setupCartDrawer() {
  document.getElementById('openCartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  document.getElementById('btnSubmitCart')?.addEventListener('click', () => {
    const items = cartStore.getItems();
    if (items.length === 0) {
      alert('Adicione pelo menos um produto ao seu pedido para avançar para o checkout.');
      return;
    }
    window.location.href = 'checkout.html';
  });
}

document.addEventListener('DOMContentLoaded', initTrackingPage);

