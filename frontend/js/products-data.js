// Base de Dados Centralizada de Produtos TradeX (China ➔ Angola)
/*
export const PRODUCTS_DATA = [
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
      {
        url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Vista Frontal do Módulo'
      },
      {
        url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Detalhe das Células PERC'
      },
      {
        url: 'https://images.unsplash.com/photo-1559302504-64aae6ca6b6f?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Montagem e Paletização de Fábrica'
      }
    ],
    specs: 'Tier 1 Fabrico Foshan | Eficiência 21.3% | Vidro temperado antirreflexo | Garantia 12 anos',
    description: 'Módulos solares monocristalinos de alta eficiência projetados para resistir ao calor e à poeira característicos de Angola. Tecnologia multi-busbar que minimiza perdas de energia por aquecimento e sombreamento.',
    techSpecs: [
      { label: 'Potência Máxima (Pmax)', value: '550W por painel (Total palete: 16.5 kW)' },
      { label: 'Eficiência do Módulo', value: '21.34%' },
      { label: 'Tipo de Célula', value: 'Monocristalina 182x182mm (144 Half-Cells)' },
      { label: 'Dimensões por Painel', value: '2279 × 1134 × 35 mm' },
      { label: 'Peso por Painel', value: '28.5 kg' },
      { label: 'Quadro Estrutural', value: 'Alumínio anodizado resistente à corrosão' },
      { label: 'Caixa de Junção', value: 'Proteção IP68 com 3 diodos bypass' },
      { label: 'Certificações Internacionais', value: 'TÜV Rheinland, CE, IEC 61215, ISO 9001' },
      { label: 'Garantia de Desempenho', value: '12 anos de produto e 25 anos linear a 84.8%' }
    ],
    logistics: {
      originPort: 'Porto de Nansha / Shenzhen (China)',
      destinationPort: 'Porto de Luanda (Angola)',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Palete vertical reforçada com cantoneiras plásticas e filme retrátil'
    }
  },
  {
    id: 'prod-02',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Inversor Solar Híbrido 5.5kW 48V Pure Sine Wave',
    origin: 'Shenzhen, Guangdong',
    badge: 'Mais Vendido',
    moq: '1 Unidade',
    priceAoa: 820000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Painel Frontal com Display LCD'
      },
      {
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Bornes de Ligação e Conectores'
      },
      {
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Ventilação e Dissipador Lateral'
      }
    ],
    specs: 'Compatível com Baterias Lítio & Gel | Controlador MPPT 100A integrado | Monitorização Wi-Fi',
    description: 'Inversor solar inteligente multifuncional combinando funções de inversor de onda senoidal pura, carregador solar MPPT e carregador de bateria AC. Oferece suporte ininterrupto de energia para residências e escritórios.',
    techSpecs: [
      { label: 'Potência Nominal', value: '5500W / 5500VA contínua (Pico 11000VA)' },
      { label: 'Tensão da Bateria', value: '48V DC' },
      { label: 'Controlador Solar', value: 'MPPT integrado 100A (Máx. 500V DC entrada PV)' },
      { label: 'Forma de Onda', value: 'Onda senoidal pura (Pure Sine Wave)' },
      { label: 'Monitorização', value: 'Módulo Wi-Fi / GPRS integrado para telemóvel' },
      { label: 'Eficiência Inversão', value: '93.5% de pico' },
      { label: 'Dimensões', value: '482 × 290 × 113 mm (10.5 kg)' },
      { label: 'Garantia de Fábrica', value: '3 anos com suporte técnico de peças' }
    ],
    logistics: {
      originPort: 'Shenzhen / Guangzhou',
      destinationPort: 'Luanda (Angola)',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Caixa de cartão triplo ondulado com espuma moldada à medida'
    }
  },
  {
    id: 'prod-03',
    category: 'solar',
    categoryLabel: 'Energia Solar',
    title: 'Bateria de Lítio LiFePO4 48V 100Ah (5.12kWh Rack Mount)',
    origin: 'Dongguan, Guangdong',
    badge: '6000 Ciclos',
    moq: '1 Unidade',
    priceAoa: 1250000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Módulo Rack Frontal'
      },
      {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Terminal de Potência e Porta BMS'
      },
      {
        url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Vista de Instalação Empilhada'
      }
    ],
    specs: 'Mais de 6000 ciclos a 80% DOD | BMS inteligente integrado | Comunicação CAN/RS485',
    description: 'Bateria de fosfato de ferro-lítio (LiFePO4) de alta densidade energética com BMS ativo. Projetada para longa vida útil de armazenamento de energia solar residencial ou corporativo com até 15 unidades em paralelo.',
    techSpecs: [
      { label: 'Energia Total Armazenada', value: '5.12 kWh' },
      { label: 'Tensão Nominal', value: '51.2V DC (Faixa operacional: 44.8V a 58.4V)' },
      { label: 'Capacidade Nominal', value: '100 Ah' },
      { label: 'Vida Útil em Ciclos', value: '≥ 6000 ciclos a 80% DOD (25°C)' },
      { label: 'Comunicação Compatível', value: 'CAN, RS485 (Victron, Deye, Growatt, etc.)' },
      { label: 'Peso', value: '44 kg' },
      { label: 'Certificações de Segurança', value: 'UN38.3, MSDS, CE, IEC 62619' }
    ],
    logistics: {
      originPort: 'Dongguan / Yantian, Shenzhen',
      destinationPort: 'Porto de Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Embalagem certificada UN para transporte internacional de lítio'
    }
  },
  {
    id: 'prod-04',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Mini Betoneira Elétrica 350L Motor Cobre 220V',
    origin: 'Guangzhou, Guangdong',
    badge: 'Alta Resistência',
    moq: '2 Unidades',
    priceAoa: 680000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Vista Global da Máquina'
      },
      {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Detalhe do Motor de Cobre Selado'
      },
      {
        url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Tambor Reforçado e Rodas em Ferro'
      }
    ],
    specs: 'Tambor reforçado 3mm | Rodas de ferro fundido com revestimento | Capacidade mistura 260L',
    description: 'Betoneira compacta para canteiros de obras de alvenaria e reboco. Equipada com motor monofásico 100% cobre com protetor térmico contra oscilações de energia comuns na rede elétrica.',
    techSpecs: [
      { label: 'Capacidade do Tambor', value: '350 Litros (Capacidade de mistura útil: 260L)' },
      { label: 'Motor Elétrico', value: '1.5 kW (2.0 HP) 100% enrolamento de cobre' },
      { label: 'Voltagem / Frequência', value: '220V / 50Hz Monofásico' },
      { label: 'Espessura da Chapa', value: 'Fundo 3.0mm / Corpo 2.0mm aço reforçado' },
      { label: 'Velocidade do Tambor', value: '28 a 30 RPM' },
      { label: 'Peso Total', value: '68 kg com rodas para fácil mobilidade' }
    ],
    logistics: {
      originPort: 'Guangzhou Port',
      destinationPort: 'Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Grade de aço protetora com plástico bolha e caixa de papelão kraft'
    }
  },
  {
    id: 'prod-05',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Conjunto de Andaimes Modulares Galvanizados (100 m²)',
    origin: 'Tianjin',
    badge: 'Segurança Q235',
    moq: '1 Lote de 100 m²',
    priceAoa: 1950000,
    unit: 'conjunto',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Estrutura Montada com Pranchas'
      },
      {
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Encaixes Rápidos Ringlock'
      },
      {
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Fardos Prontos para Contentor'
      }
    ],
    specs: 'Aço carbono Q235 galvanizado a quente | Travessas diagonais, guarda-corpos e pranchas antiderrapantes',
    description: 'Sistema completo de andaime tubular modular Ringlock galvanizado a quente, projetado para fachadas, pintura, alvenaria e manutenção industrial com montagem rápida e sem ferramentas especiais.',
    techSpecs: [
      { label: 'Área Coberta', value: '100 m² de fachada' },
      { label: 'Material', value: 'Tubo de aço Q235 diâmetro 48.3 × 3.2 mm' },
      { label: 'Tratamento de Superfície', value: 'Galvanização a quente (Hot-dip galvanized >60μm)' },
      { label: 'Capacidade de Carga', value: 'Até 450 kg/m² nas plataformas de trabalho' },
      { label: 'Componentes Inclusos', value: 'Postes verticais, travessas horizontais, diagonais, pranchas de aço e bases com rosca' }
    ],
    logistics: {
      originPort: 'Porto de Tianjin (China)',
      destinationPort: 'Porto de Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Carga amarrada em fardos de aço para carregamento direto em contentor'
    }
  },
  {
    id: 'prod-06',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Compactador de Solo Tipo Sapo (Motor Gasolina 5.5HP)',
    origin: 'Yiwu, Zhejiang',
    badge: 'Impacto 13.7kN',
    moq: '1 Unidade',
    priceAoa: 540000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Vista Frontal e Alavanca'
      },
      {
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Motor 4 Tempos e Filtro'
      },
      {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Sapata Forjada de Alta Resistência'
      }
    ],
    specs: 'Força de impacto 13.7 kN | Tanque anticorrosivo | Ideal para valas e alicerces',
    description: 'Compactador de percussão profissional com sapata de poliuretano e aço forjado. Excelente para compactação de solos argilosos e valas para canalizações e fundações em Luanda e províncias.',
    techSpecs: [
      { label: 'Motor', value: 'Gasolina 4 Tempos 160cc (5.5 HP) refrigerado a ar' },
      { label: 'Força de Impacto', value: '13.7 kN' },
      { label: 'Frequência de Salto', value: '640 a 680 golpes por minuto' },
      { label: 'Tamanho da Sapata', value: '340 × 285 mm aço laminado com inserto' },
      { label: 'Peso Operacional', value: '75 kg' }
    ],
    logistics: {
      originPort: 'Ningbo / Yiwu',
      destinationPort: 'Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Caixa de madeira compensada compensada de exportação (Fumigada)'
    }
  },
  {
    id: 'prod-07',
    category: 'industrial',
    categoryLabel: 'Construção & Equipamento',
    title: 'Máquina Bloqueira Hidráulica para Blocos de Cimento',
    origin: 'Linyi, Shandong',
    badge: 'Produção 2500/dia',
    moq: '1 Linha Completa',
    priceAoa: 3900000,
    unit: 'linha',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Prensa Hidráulica e Painel de Comando'
      },
      {
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Moldes Intercambiáveis de Blocos'
      },
      {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Esteira e Alimentador Automático'
      }
    ],
    specs: 'Produção 2500 blocos/dia | Moldes intercambiáveis para blocos de 10, 15 e 20cm',
    description: 'Linha semi-automática de produção de blocos de betão com sistema de vibração hidráulica dupla. Produz blocos ocos, maciços e pavês para calçadas com alta densidade e cura uniforme.',
    techSpecs: [
      { label: 'Capacidade de Produção', value: '2500 a 3500 blocos por turno de 8h' },
      { label: 'Pressão Hidráulica', value: '16 MPa (Cilindros de alta pressão)' },
      { label: 'Potência Total Instalada', value: '9.6 kW (Trifásico 380V / 50Hz)' },
      { label: 'Moldes Inclusos', value: 'Molde para bloco de 15cm e molde de 20cm' },
      { label: 'Ciclo de Moldagem', value: '25 a 35 segundos por prensagem' }
    ],
    logistics: {
      originPort: 'Porto de Qingdao (Shandong)',
      destinationPort: 'Porto de Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Contentor 20ft consolidado FCL'
    }
  },
  {
    id: 'prod-08',
    category: 'electronics',
    categoryLabel: 'Eletrónicos & Iluminação',
    title: 'Campânula LED Industrial High Bay 200W IP65 (Caixa 10 un.)',
    origin: 'Zhongshan, Guangdong',
    badge: 'IP65 Industrial',
    moq: '1 Caixa (10 un.)',
    priceAoa: 490000,
    unit: 'caixa',
    image: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Vista Inferior dos LEDs e Difusor'
      },
      {
        url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Dissipador Térmico de Alumínio Fundido'
      },
      {
        url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Gancho e Corrente de Fixação Industrial'
      }
    ],
    specs: 'Luminosidade 26.000 lm | Luz Fria 6500K | Driver Meanwell de alta eficiência',
    description: 'Iluminação potente para armazéns, oficinas, ginásios e superfícies comerciais. Construída em alumínio puro fundido com dissipação de aletas para suportar temperaturas ambientes até 50°C.',
    techSpecs: [
      { label: 'Potência por Campânula', value: '200W (Total da caixa: 2000W)' },
      { label: 'Fluxo Luminoso', value: '130 lm/W (26.000 lúmens por peça)' },
      { label: 'Grau de Proteção', value: 'IP65 (Totalmente vedada contra poeira e jatos de água)' },
      { label: 'Temperatura de Cor', value: '6500K (Luz branca do dia)' },
      { label: 'Tensão de Operação', value: 'AC 85V - 265V Bivolt automático' },
      { label: 'Vida Útil Estimada', value: '> 50.000 horas' }
    ],
    logistics: {
      originPort: 'Zhongshan / Guangzhou',
      destinationPort: 'Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Caixa mestra reforçada com divisórias de espuma para cada campânula'
    }
  },
  {
    id: 'prod-09',
    category: 'electronics',
    categoryLabel: 'Eletrónicos & Iluminação',
    title: 'Refletores Solares LED 300W com Painel (Lote 20 un.)',
    origin: 'Zhongshan, Guangdong',
    badge: 'Autonomia 14h',
    moq: '1 Lote (20 un.)',
    priceAoa: 560000,
    unit: 'lote',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Refletor Frontal com LEDs SMD'
      },
      {
        url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Painel Fotovoltaico Dedicado e Cabo'
      },
      {
        url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Comando Remoto e Suporte de Fixação'
      }
    ],
    specs: 'Bateria LiFePO4 de longa duração | Sensor crepuscular com controlo remoto',
    description: 'Iluminação autônoma 100% solar com zero consumo de rede elétrica. Inclui painel solar dedicado, bateria de lítio interna, suporte articulado e comando à distância para programação de horários.',
    techSpecs: [
      { label: 'Potência Equivalente', value: '300W LED' },
      { label: 'Bateria Interna', value: 'LiFePO4 3.2V 30.000mAh' },
      { label: 'Painel Solar', value: 'Policristalino 6V 35W de alta absorção' },
      { label: 'Autonomia Noturna', value: '12 a 15 horas contínuas' },
      { label: 'Tempo de Carregamento', value: '5 a 6 horas de sol pleno' },
      { label: 'Controlo Remoto', value: 'Alcance até 12 metros com funções de temporizador' }
    ],
    logistics: {
      originPort: 'Zhongshan / Guangzhou',
      destinationPort: 'Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Caixa coletiva paletizada com 20 caixas individuais coloridas'
    }
  },
  {
    id: 'prod-10',
    category: 'machinery',
    categoryLabel: 'Maquinaria & Geradores',
    title: 'Conjunto Gerador Diesel Silencioso 15kVA Trifásico',
    origin: 'Wuxi, Jiangsu',
    badge: 'Insonorizado 68dB',
    moq: '1 Unidade',
    priceAoa: 3200000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Cabine Insonorizada Fechada'
      },
      {
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Painel Digital ATS e Disjuntor'
      },
      {
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Compartimento Aberto do Motor 4 Cilindros'
      }
    ],
    specs: 'Motor diesel 4 cilindros com arranque automático ATS | Cabine insonorizada 68dB',
    description: 'Gerador a diesel silencioso com alternador 100% de cobre sem escovas. Desenvolvido para regime contínuo (Prime Power) ou emergência (Standby) em clínicas, residências e instalações industriais em Angola.',
    techSpecs: [
      { label: 'Potência Standby', value: '15 kVA (12 kW)' },
      { label: 'Potência Contínua (Prime)', value: '13.5 kVA (10.8 kW)' },
      { label: 'Nível de Ruído', value: '68 dB(A) a 7 metros de distância' },
      { label: 'Alternador', value: 'Trifásico 400V/230V 50Hz, 100% Cobre com AVR' },
      { label: 'Consumo Médio', value: 'Aprox. 2.8 L/hora a 75% de carga' },
      { label: 'Capacidade do Tanque', value: '55 Litros (Autonomia >18 horas)' }
    ],
    logistics: {
      originPort: 'Porto de Shanghai / Wuxi',
      destinationPort: 'Porto de Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Caixa de madeira tratada com proteção contra salinidade marítima'
    }
  },
  {
    id: 'prod-11',
    category: 'machinery',
    categoryLabel: 'Maquinaria & Geradores',
    title: 'Mini Trator Agrícola 25HP 4x4 com Freza e Arado',
    origin: 'Weifang, Shandong',
    badge: 'Maquinaria Direta',
    moq: '1 Unidade',
    priceAoa: 4800000,
    unit: 'unidade',
    image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Vista Lateral do Trator 4x4'
      },
      {
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Engate Traseiro de 3 Pontos com Freza'
      },
      {
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Posto de Condução e Alavancas'
      }
    ],
    specs: 'Motor diesel monocilíndrico de alta compressão | Tração 4x4 e tomada de força PTO',
    description: 'Trator agrícola compacto e versátil, concebido para preparação de solos, hortas, lavouras de mandioca, milho e pequenas quintas em Angola. Econômico e de manutenção simples com ferramentas padrão.',
    techSpecs: [
      { label: 'Potência do Motor', value: '25 Cavalos (18.4 kW) Diesel' },
      { label: 'Tração', value: 'Tração integral 4x4 selecionável com bloqueio' },
      { label: 'Tomada de Força (PTO)', value: 'Standard 540 / 720 RPM' },
      { label: 'Implementos Inclusos', value: 'Arado de 2 aivecas + Freza rotativa de 1.2m' },
      { label: 'Transmissão', value: '(3+1)×2 marchas (6 à frente + 2 à ré)' },
      { label: 'Peso Total', value: '1150 kg com contrapesos dianteiros' }
    ],
    logistics: {
      originPort: 'Porto de Qingdao',
      destinationPort: 'Porto de Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Estrutura de armação de aço desmontável para transporte marítimo'
    }
  },
  {
    id: 'prod-12',
    category: 'construction',
    categoryLabel: 'Materiais de Construção',
    title: 'Telhas Trapezoidais Aluzinco Calibre 28 (Lote 100 folhas de 6m)',
    origin: 'Foshan, Guangdong',
    badge: 'Anti-corrosão AZ150',
    moq: '1 Lote (100 folhas)',
    priceAoa: 1650000,
    unit: 'lote',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 1: Perfil Trapezoidal Ondulado'
      },
      {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 2: Detalhe do Revestimento de Zinco e Alumínio'
      },
      {
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=1000&auto=format&fit=crop&q=80',
        label: 'Ângulo 3: Fardo Empilhado de 100 Folhas'
      }
    ],
    specs: 'Revestimento AZ150 anticorrosão tropical | Largura útil 1000mm | Resistência elevada aos UV',
    description: 'Chapas para cobertura em liga Galvalume (55% Alumínio, 43.4% Zinco e 1.6% Silício). Até 4 vezes mais resistentes à corrosão da orla marítima de Luanda do que a chapa galvanizada comum.',
    techSpecs: [
      { label: 'Quantidade do Lote', value: '100 Folhas de 6.0 metros cada (Total: 600m)' },
      { label: 'Espessura Nominal', value: 'Calibre 28 (0.35 mm real)' },
      { label: 'Largura Útil', value: '1000 mm (1 metro de cobertura efetiva)' },
      { label: 'Revestimento Metálico', value: 'AZ150 (150 g/m² de liga Aluzinc nos dois lados)' },
      { label: 'Resistência ao Clima', value: 'Excelente contra maresia, chuvas tropicais e calor intenso' }
    ],
    logistics: {
      originPort: 'Foshan / Nansha, Guangzhou',
      destinationPort: 'Porto de Luanda',
      transitTimeSea: '30 a 60 dias',
      transitTimeAir: '5 a 15 dias',
      packing: 'Embalagem marítima com papel impermeável, chapa de aço de proteção e cintas'
    }
  }
];

*/