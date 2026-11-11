# Plano de Implementação — Ajustes e Novas Funcionalidades

> Origem: reunião Osmar Pessela × Eldissone Vilonga (Nov 2026). Este plano cruza o que foi acordado com o estado actual do código.

## Estado de implementação (actualizado em 2026-11-11)

| Fase | Estado | Notas |
|---|---|---|
| 0 — Fundações | Feita | PostgreSQL via Prisma, JWT + bcrypt, permissões por papel, preços calculados no servidor |
| 1 — Ajustes da reunião | Feita | Menu único (Produtos / Rastreio), sem AGT/alfândega/navios, prazos 30–60 e 5–15 dias; taxas e prazos editáveis desde a Fase 3 |
| 2 — Contas e convidados | Feita | Rastreio com e-mail, carrinho guardado, criar conta a partir da compra, redefinição de palavra-passe |
| 3 — Backoffice | Feita, com lacunas | Ver "Por fazer" |
| 4 — Pagamento por transferência | Feita | Upload real do comprovativo, validação e motivo de rejeição |
| 5 — WhatsApp e IA | Feita, não testada com credenciais reais | Notificações, webhook, assistente com ferramentas, conversas no backoffice. Sem credenciais da Meta, SMTP e Anthropic, os envios são simulados |
| 6 — Parceiro transportador | **Não iniciada** | Falta especificação e parecer jurídico |

**Por fazer**

- **Fase 6** inteira (perfil do parceiro, viagens, modalidade "Expresso Bagagem").
- **Investigação da PayGo** (tarefa do Eldissone): requisitos, documentação, comissões, API e webhook. O webhook de pagamentos já existe, desligado.
- **Decisões em aberto** da secção 5 (nenhuma respondida).
- **Analytics de visitantes** (visitas, origem do tráfego): só se medem contas, convidados e carrinhos.
- Fornecedores: ver as encomendas associadas na ficha. Dados de contacto do agente parceiro configuráveis.
- CMS: promoções, notícias e páginas usam o editor antigo; as imagens dos banners ainda são um URL escrito à mão.
- Testar o assistente e os envios com credenciais reais.
- Produção: ver [Antes de produção](../operacao.md#antes-de-produção).

**Diferenças face ao plano original.** O esquema real está em [schema.prisma](../../backend/prisma/schema.prisma). As principais: `Order` guarda os dados do cliente (`customerName`, `customerEmail`, …) em vez de `guest*`; o estado do pagamento em validação chama-se `REVIEW_PENDING` (não `PROOF_SUBMITTED`) e o ficheiro fica em `proofPath`; os conteúdos do CMS ficam em `Setting` (`cms`) em vez de `ContentItem`; as mensagens chamam-se `ConversationMessage`; o papel `CARRIER_PARTNER` não foi criado.

---

## 1. Diagnóstico inicial (histórico)

Situação do código **antes** de começar a implementar. Mantém-se como registo do ponto de partida; já não descreve o estado actual.

| Área | Situação hoje | Impacto |
|---|---|---|
| Persistência | O esquema Prisma existe ([schema.prisma](../../backend/prisma/schema.prisma)), mas todas as rotas usam arrays em memória (`MOCK_ORDERS`, `MOCK_PAYMENTS`, `SUPPLIERS`, `INITIAL_PRODUCTS`, `TRACKING_DB`). O frontend guarda utilizadores, encomendas e pagamentos em `localStorage` ([auth.js](../../frontend/js/auth.js)). | Os dados perdem-se quando o servidor reinicia. Métricas de utilizadores e conversão são impossíveis sem dados reais. |
| Autenticação | Palavras-passe gravadas em texto simples, token falso (`tradex_jwt_token_<id>`), utilizadores demo com credenciais fixas no código ([auth.routes.js](../../backend/src/presentation/routes/auth.routes.js)). As rotas `/admin`, `PATCH /orders/:n/status` e `/payments/reconcile` não têm protecção. | Qualquer pessoa pode alterar estados de encomendas ou aprovar pagamentos. |
| Área do cliente | `cliente.js:8` inicia sessão automaticamente com a conta demo. | Contraria a regra acordada: o painel de encomendas exige sessão iniciada. |
| Pagamentos | O checkout tem Multicaixa Express como opção por defeito, com aprovação simulada; o envio de comprovativo é só um botão de simulação, sem ficheiro. | Na fase 1 só existe transferência bancária, e o comprovativo tem de ser um ficheiro real. |
| AGT / alfândega / navios | 61 referências no frontend (KPI "Taxa Desalfandegamento", estado `CUSTOMS_CLEARANCE`, documentos DU/AGT, B/L, nomes de navios, taxa "seguro aduaneiro" de 4%). | Ficou decidido retirar estas referências: o agente parceiro trata do trânsito e o cliente só vê a entrega porta a porta. |
| Prazos | Checkout: marítimo "35 a 45 dias", aéreo "7 a 12 dias". | O acordado é marítimo **30 a 60 dias** e aéreo **5 a 15 dias**. |
| Navegação | Cabeçalhos diferentes em cada página (index tem 6 links institucionais; cliente tem "Simulador Aduaneiro"; checkout tem outro conjunto). Sem menu suspenso de categorias. | Precisa de um cabeçalho único: **Produtos** (com menu suspenso) e **Rastreio**. |

---

## 2. Fases

As fases estão ordenadas por dependência. A Fase 0 é pré-requisito das Fases 2 e 3. A Fase 1 pode avançar ao mesmo tempo que a Fase 0, porque é quase só frontend.

### Fase 0 — Fundações (pré-requisito)

**Objectivo:** passar de dados simulados a dados reais e seguros.

1. **Persistência real com Prisma**
   - Migrar `orders`, `payments`, `products`, `tracking` e `admin` para repositórios Prisma (camada `src/infrastructure`, já prevista no README).
   - Criar um script de seed com os produtos de [products-data.js](../../frontend/js/products-data.js) e os fornecedores actuais.
   - Retirar os fallbacks em memória, ou deixá-los apenas em `NODE_ENV=development`.
2. **Autenticação**
   - `bcrypt` para as palavras-passe e JWT assinado (`JWT_SECRET` no `.env`).
   - Middleware `requireAuth` e `requireRole('ADMIN'|'STAFF')`.
   - Proteger `/admin/*`, `PATCH /orders/:n/status`, `/payments/reconcile` e `POST /products`.
   - Retirar as credenciais demo do código e criar o admin inicial através de variáveis de ambiente (o mecanismo `registerAdminInMemory` já existe e passa a gravar na base de dados).
   - Implementar a recuperação de palavra-passe com um token de uso único (hoje só devolve uma mensagem).
3. **Frontend a ler da API**
   - [api.js](../../frontend/js/api.js) passa a ser a única fonte de dados. O `localStorage` fica só para o carrinho e para preferências.
   - O login do backoffice deixa de usar a flag `tradex_admin_logged` e passa a validar o JWT com role ADMIN.

**Concluído quando:** os dados sobrevivem a um reinício do servidor, nenhuma rota de escrita do backoffice responde sem token, e não há palavras-passe em texto simples.

---

### Fase 1 — Ajustes acordados na reunião (ganhos rápidos)

#### 1.1 Cabeçalho simplificado com menu suspenso de categorias
- Criar um componente de cabeçalho partilhado (`frontend/js/header.js`) injectado em todas as páginas, para acabar com o HTML duplicado.
- Links: **Produtos** (o clique abre um menu suspenso) e **Rastreio**. Retirar os links de Eletrónicos e Construção, bem como os links institucionais do topo (que passam para o rodapé).
- O menu suspenso lista as categorias reais (`solar`, `industrial`, `machinery`, `construction`, `electronics`), cada uma com ícone, e liga a `catalogo.html?categoria=<slug>`. Em telemóvel funciona como acordeão.
- Ícones à direita: pesquisa, carrinho e conta.
- Mais tarde, as categorias passam a vir de `GET /categories` (o modelo `Category` já existe).

#### 1.2 Retirar AGT, desalfandegamento e burocracia de navios
- **Backoffice:** retirar o KPI "Taxa Desalfandegamento / Conforme AGT" (`admin.html:179`) e o campo `agtClearanceRate` ([admin.routes.js](../../backend/src/presentation/routes/admin.routes.js)). Em seu lugar, usar um KPI útil, como **"Entregas concluídas no prazo"** ou **"Encomendas aguardando validação de pagamento"**.
- **Estados da encomenda:** simplificar o ciclo para o cliente:
  `AGUARDANDO_PAGAMENTO → PAGAMENTO_CONFIRMADO → EM_PROCESSAMENTO (compra na China) → ENVIADO (aéreo/marítimo) → CHEGOU_A_ANGOLA → PRONTO_PARA_LEVANTAMENTO | EM_ENTREGA → ENTREGUE` (+ `CANCELADO`).
  Retirar `CUSTOMS_CLEARANCE` do enum Prisma, do modal de estados (`admin.html:655`) e dos modelos de notificação.
- **Rastreio:** retirar B/L, contentor, nome do navio, coordenadas, DU/AGT e certificados ([tracking.routes.js](../../backend/src/presentation/routes/tracking.routes.js), [rastreio.js](../../frontend/js/rastreio.js)). Mostrar apenas o modo (aéreo/marítimo), o estado, a linha temporal simplificada e a data prevista.
- **Checkout:** retirar a linha "Seguro/Taxas aduaneiras 4%" e cobrar um **frete porta a porta** único, já com o custo do agente parceiro. Retirar "Simulador Aduaneiro" e "desembaraço alfandegário" dos textos e meta descriptions.
- Fazer uma passagem com `grep -i "agt\|aduane\|desalfandeg\|desembara"` em `frontend/` e `backend/` até ficar a zero.

#### 1.3 Prazos de entrega corrigidos
- Marítimo: **30 a 60 dias**. Aéreo: **5 a 15 dias**.
- Centralizar estes valores numa constante única (`shared/shipping.js` ou um endpoint `GET /config/shipping`), usada no checkout, na página de produto, no rastreio e no backend. Hoje estão repetidos em `checkout.html:269`, `checkout.js:320` e [orders.routes.js](../../backend/src/presentation/routes/orders.routes.js).
- A escolha da modalidade continua antes do pagamento, como já acontece.

#### 1.4 Entrega: levantamento gratuito ou domicílio com taxa
- Manter: levantamento no Terminal TradeX (gratuito, opção por defeito), entrega em Luanda (taxa) e interprovincial (taxa).
- Mover os valores das taxas para configuração editável no backoffice (hoje estão fixos: 15 000 e 35 000 Kz).

---

### Fase 2 — Contas, convidados e área do cliente

#### 2.1 Regras de acesso
- Sem sessão: catálogo, produto, carrinho, rastreio por código e checkout como convidado.
- Com sessão: painel de encomendas, histórico de estados, pagamentos, moradas, favoritos e retoma de carrinho.
- Retirar o login automático de `cliente.js:8` e redireccionar para o login com `?next=cliente.html`.

#### 2.2 Encomendas de convidados (base para medir a conversão)
- **Prisma:** `Order.customerId` passa a opcional. Acrescentar `guestEmail`, `guestPhone`, `guestName` e `isGuest Boolean`.
- No fim do checkout como convidado, propor "Criar conta com estes dados". Se o convidado aceitar, as encomendas anteriores com o mesmo e-mail ou telefone são associadas à nova conta.
- Rastreio de convidado: código da encomenda mais o e-mail ou telefone como segundo factor.

#### 2.3 Carrinho persistente para utilizadores com sessão
- Modelo `Cart` / `CartItem` no servidor, sincronizado com o carrinho local quando o utilizador inicia sessão. Isto permite medir carrinhos abandonados.

---

### Fase 3 — Backoffice (BOSF)

#### 3.1 Gestão de utilizadores e análise de conversão *(novo)*
- Novo separador **Utilizadores** em [admin.html](../../frontend/admin.html):
  - Lista com pesquisa e filtros: registados, convidados, com compra, sem compra.
  - Detalhe do utilizador: encomendas, valor total, último acesso.
  - Acções: activar/desactivar e alterar role (ADMIN/STAFF/CUSTOMER).
- **Métricas novas na Visão Geral** (`GET /admin/analytics`):
  - Total de utilizadores registados e novos por período.
  - Utilizadores que compraram e taxa de compra (compradores ÷ registados).
  - Encomendas de convidados face a contas registadas (% e valor).
  - Conversão de convidado para conta.
  - Carrinhos abandonados (depende da 2.3).
- **Prisma:** `User.lastLoginAt`, `User.active` e, se for preciso analisar o comportamento dos visitantes, um modelo leve `VisitEvent` (sessão anónima, página, origem) ou uma ferramenta de analytics externa (Plausible ou GA4).

#### 3.2 Encomendas
- Ligar o modal de estados à API real com os estados simplificados da 1.2.
- Cada mudança de estado grava um `TrackingEvent` e, opcionalmente, envia uma notificação (3.6).
- Filtros por estado, modalidade (aéreo/marítimo), forma de entrega e período.

#### 3.3 Catálogo de produtos
- CRUD completo (hoje só existe `POST`): editar, desactivar, imagens múltiplas, categoria, preço e prazo por modalidade.
- Marcar o produto como "Em destaque" (ligado ao CMS).

#### 3.4 Fornecedores na China
- **Prisma:** novo modelo `Supplier` (nome, província, categorias, pessoa de contacto, **e-mail**, WeChat, WhatsApp, termos, avaliação, notas) e relação `Product.supplierId`.
- CRUD no backoffice. Hoje os fornecedores são uma lista fixa sem e-mail.
- Na ficha do fornecedor, mostrar as encomendas associadas.

#### 3.5 Logística (navios e voos) simplificada
- Reorientar o módulo para **lotes de envio do agente parceiro**: `Shipment` com modo (AIR/SEA), referência interna do agente, data de partida, data prevista de chegada, estado e encomendas incluídas.
- Retirar do modelo e da interface os campos `blNumber`, `vessel`, `container` e o estado `CUSTOMS`.
- Acção em massa: actualizar o estado de um lote propaga o estado a todas as encomendas desse lote e notifica os clientes.
- Dados de contacto do agente parceiro, configuráveis.

#### 3.6 Financeiro
- Lista de pagamentos com o estado "Comprovativo submetido / aguarda validação" em destaque.
- Visualizar o comprovativo enviado (PDF ou imagem) e aprovar ou rejeitar com um motivo. A aprovação muda a encomenda para `PAGAMENTO_CONFIRMADO` e notifica o cliente.
- Resumo: recebido, pendente de validação e rejeitado, por período.
- Dados bancários da empresa (IBAN e banco) configuráveis no backoffice e mostrados no checkout.

#### 3.7 Conteúdos (CMS)
- Hoje os banners e o "Catálogo em Destaque" estão no frontend e em `localStorage` ([cms.js](../../frontend/js/cms.js)). Persistir em `ContentItem` (tipo, título, imagem, link, ordem, activo, datas de publicação).
- Upload de imagens para um armazenamento local ou S3-compatível.

---

### Fase 4 — Pagamentos (fase 1: transferência bancária)

1. Checkout com **transferência bancária como único método activo**. Multicaixa Express e Referência ficam escondidos atrás de uma *feature flag* (`PAYMENT_MCX_ENABLED=false`), sem apagar o código.
2. **Upload real do comprovativo:** `<input type="file">` (PDF, JPG ou PNG, máximo de 5 MB) e `POST /payments/:orderNumber/proof` com `multer`. O ficheiro fica guardado fora da pasta pública e acessível só a admins.
3. **Prisma:** `Payment.proofUrl`, `proofUploadedAt`, `reviewedBy`, `reviewedAt` e `rejectionReason`. Acrescentar o estado `PROOF_SUBMITTED` ao `PaymentStatus`.
4. O cliente pode enviar o comprovativo mais tarde a partir da área do cliente, ou a partir do link de rastreio no caso dos convidados.
5. Prazo de validação comunicado ao cliente ("até 2 horas úteis", texto que já existe).

**Investigação — PayGo** (responsável: Eldissone)
- Levantar os requisitos para a conta empresarial, a documentação exigida (alvará, NIF, estatutos, BI dos sócios), as comissões, os métodos suportados (MCX Express, referência, cartões), a existência de API e webhook e o tempo de activação.
- Comparar com a licença directa do gateway EMIS/Multicaixa.
- Resultado esperado: uma nota de decisão e, se for viável, um adaptador `PaymentProvider` em `src/infrastructure/payments/` (a arquitectura já prevê adaptadores). O webhook actual (`/payments/webhook`) passa a validar a assinatura.

---

### Fase 5 — Atendimento com IA no WhatsApp

- Integração com a WhatsApp Business Cloud API (o separador de notificações já existe, mas só simula o envio).
- **Fase 5a:** notificações reais de mudança de estado (modelos aprovados pela Meta).
- **Fase 5b:** assistente com IA que responde a perguntas sobre produtos, prazos e o estado da encomenda (a partir do número de telefone ou do código), com passagem para um humano.
- **Sincronização:** pedidos criados pelo WhatsApp entram como `Order` com `channel = WHATSAPP`, e as conversas ficam associadas ao cliente.
- **Prisma:** `Order.channel` (WEB | WHATSAPP | ADMIN), `Conversation`, `Message`.

---

### Fase 6 — Parceiro Transportador ("Malas") — versão futura

Novo modelo de negócio: passageiros que viajam China → Angola vendem espaço livre na bagagem (por exemplo 23 kg) para envio rápido de itens leves.

- **Novo role:** `CARRIER_PARTNER`, com registo próprio e validação documental (BI/passaporte, bilhete de avião) feita pelo backoffice.
- **Oferta de viagem:** data, rota (cidade de origem → Luanda), kg disponíveis, preço por kg e prazo para entrega na origem.
- **Atribuição:** o backoffice (ou uma regra automática) atribui encomendas leves e elegíveis a uma viagem, e surge uma terceira modalidade de envio no checkout: **"Expresso Bagagem"**.
- **Fluxo:** a TradeX entrega o volume ao transportador na China, o transportador viaja, entrega no Terminal TradeX em Luanda, e o pagamento ao transportador é feito depois da confirmação.
- **Riscos a tratar antes:** regras de bagagem das companhias, responsabilidade e seguro, lista de artigos proibidos e termos e condições específicos. É necessário um parecer jurídico.
- **Prisma:** `CarrierProfile`, `CarrierTrip`, `CarrierAssignment`, e `TransportMode` passa a incluir `LUGGAGE`.

---

## 3. Alterações ao esquema Prisma (resumo do plano original)

| Modelo | Alteração | Fase |
|---|---|---|
| `User` | `lastLoginAt`, `active`; role `CARRIER_PARTNER` | 3.1 / 6 |
| `Order` | `customerId` opcional; `isGuest`, `guestEmail`, `guestPhone`, `guestName`; `shippingMode`, `deliveryMethod`, `deliveryFeeAoa`; `shipmentId`; `channel` | 2.2 / 3.5 / 5 |
| `OrderStatus` | Estados simplificados, sem `CUSTOMS_CLEARANCE` | 1.2 |
| `Payment` | `proofUrl`, `proofUploadedAt`, `reviewedBy`, `reviewedAt`, `rejectionReason`; estado `PROOF_SUBMITTED` | 4 |
| `Shipment` | Sem `CUSTOMS`; `agentReference`, `departedAt`, `etaAt`; relação com `Order` | 3.5 |
| **Novos** | `Supplier`, `Cart`/`CartItem`, `ContentItem`, `Setting` (taxas, prazos, IBAN), `Conversation`/`Message`, `Carrier*` | 2–6 |

## 4. Ordem sugerida e estimativa indicativa

| # | Bloco | Estimativa | Depende de |
|---|---|---|---|
| 1 | Fase 1 (cabeçalho, AGT, prazos, entrega) | 3–4 dias | — |
| 2 | Fase 0 (Prisma, autenticação, API) | 1,5–2 semanas | — |
| 3 | Fase 4 (transferência e comprovativo) | 3–4 dias | 0 |
| 4 | Fase 2 (convidados e área do cliente) | 1 semana | 0 |
| 5 | Fase 3 (backoffice: utilizadores, fornecedores, logística, finanças, CMS) | 2–3 semanas | 0, 2 |
| 6 | Investigação PayGo | em paralelo | — |
| 7 | Fase 5 (WhatsApp e IA) | 2–3 semanas | 0, 3.2 |
| 8 | Fase 6 (Parceiro Transportador) | a especificar | 0, 3, parecer jurídico |

O MVP para lançamento corresponde aos itens 1 a 5: loja funcional com transferência bancária, backoffice operacional e métricas de conversão.

## 5. Decisões em aberto

1. **Frete porta a porta:** é uma percentagem do valor (hoje 8% no marítimo e 18% no aéreo), é calculado por peso ou volume, ou é uma tabela do agente parceiro?
2. **Taxas de entrega ao domicílio:** confirmar os valores para Luanda e para as províncias.
3. **Prazo exibido:** mostrar o intervalo (30–60 dias) ou uma data prevista calculada?
4. **Analytics de visitantes:** solução própria (`VisitEvent`) ou ferramenta externa (Plausible ou GA4)?
5. **Agente parceiro:** vai ter acesso ao backoffice para actualizar estados, ou essa actualização é feita sempre pela equipa TradeX?
