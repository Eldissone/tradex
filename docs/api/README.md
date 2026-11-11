# API REST

Prefixo: `/api/v1` · Formato: JSON (excepto uploads, que são `multipart/form-data`) · Código: [backend/src/presentation/routes](../../backend/src/presentation/routes)

## Convenções

**Autenticação.** Cabeçalho `Authorization: Bearer <token>`. O token vem de `POST /auth/login` ou `/auth/register`. Papéis: `CUSTOMER`, `STAFF`, `ADMIN`.

Na coluna *Acesso* das tabelas:

| Valor | Quem pode |
|---|---|
| público | Qualquer pessoa |
| opcional | Com ou sem sessão (muda o resultado) |
| sessão | Qualquer utilizador autenticado |
| staff | `STAFF` ou `ADMIN` |
| admin | Só `ADMIN` |

**Respostas.** Sucesso: `{ "ok": true, "data": … }` (listas trazem também `"total"`). Erro: `{ "ok": false, "message": "…" }`.

| Código | Significado |
|---|---|
| 400 | Dados inválidos. Erros de validação trazem `"error": "VALIDATION_ERROR"` e `"issues": [{ "path", "message" }]` |
| 401 | Sem sessão, sessão expirada ou revogada (palavra-passe alterada, conta desactivada) |
| 403 | Sem permissão para esta operação |
| 404 | Não encontrado (também usado para "sem acesso" a encomendas, para não revelar que existem) |
| 409 | Conflito de estado (ex.: pagamento já validado) |
| 413 | Ficheiro acima do limite |
| 429 | Demasiadas tentativas (cabeçalho `Retry-After`) |
| 503 | Funcionalidade não configurada (webhooks sem segredo) |

**Limites de tentativas** (por IP e rota, em memória): login/registo/redefinição 20 por 15 min · recuperação de palavra-passe 5 por hora · consulta de rastreio 30 por 15 min · envio de comprovativo 15 por 15 min.

**Valores monetários** em Kwanzas (AOA), como número inteiro. O frontend formata.

## Saúde e configuração pública

| Método e rota | Acesso | Descrição |
|---|---|---|
| `GET /health` | público | Estado da API e da base de dados |
| `GET /config/shipping` | público | Prazos, % de frete e seguro, taxas de entrega |
| `GET /config/cms` | público | Conteúdos públicos (`null` se nunca foram publicados) |

## Autenticação

| Método e rota | Acesso | Corpo / notas |
|---|---|---|
| `POST /auth/register` | público | `firstName`, `lastName?`, `email`, `phone?`, `nif?`, `password` (8+). Devolve `user` e `token`. Associa à conta as encomendas de convidado com o mesmo e-mail. |
| `POST /auth/login` | público | `email`, `password`. Devolve `user` e `token`. |
| `GET /auth/me` | sessão | Utilizador actual |
| `PATCH /auth/me` | sessão | `firstName?`, `lastName?`, `phone?`, `nif?`; para mudar a palavra-passe: `currentPassword` + `newPassword` (8+). Ao mudá-la, as sessões antigas deixam de valer e a resposta traz um `token` novo. |
| `POST /auth/recover-password` | público | `email`. Responde sempre igual (não revela se a conta existe). Envia o link por e-mail. |
| `POST /auth/reset-password` | público | `token` (do link), `password` (8+). O token vale 1 hora e só uma vez. |

## Conta do cliente (`/me`)

Todas exigem sessão.

| Método e rota | Descrição |
|---|---|
| `GET /me/addresses` · `POST /me/addresses` · `DELETE /me/addresses/:id` | Moradas de entrega (`recipientName`, `phone`, `province`, `municipality`, `street`, `reference?`, `label?`, `isDefault?`) |
| `GET /me/favorites` · `POST /me/favorites/:productId/toggle` | Favoritos (lista de ids) |
| `GET /me/cart` · `PUT /me/cart` | Carrinho guardado. `PUT` substitui tudo: `{ "items": [{ "id", "quantity" }] }`. Produtos inactivos ou inexistentes são ignorados. |

## Catálogo

| Método e rota | Acesso | Descrição |
|---|---|---|
| `GET /products` | opcional | Filtros: `category` (slug), `search`, `sort` (`price_asc`, `price_desc`). Só produtos activos; staff pode juntar `includeInactive=1`. |
| `GET /products/categories` | público | Categorias (`id`, `slug`, `name`) |
| `GET /products/:id` | público | Por id ou slug. Produtos inactivos dão 404. |
| `POST /products` | staff | `title`, `category` (slug), `priceAoa` obrigatórios; opcionais: `description`, `origin`, `badge`, `moq`, `unit`, `specs`, `image`, `images[]`, `techSpecs[]`, `logistics`, `featured`, `supplierId` |
| `PUT /products/:id` | staff | Mesmos campos, todos opcionais; `active` activa/desactiva |
| `DELETE /products/:id` | staff | Desactiva (não apaga, para manter o histórico das encomendas) |

## Encomendas

| Método e rota | Acesso | Descrição |
|---|---|---|
| `POST /orders` | opcional | Cria a encomenda. Corpo abaixo. Sem sessão fica como encomenda de convidado. |
| `GET /orders` | sessão | Cliente: as suas. Staff: todas. Filtros: `status`, `email` (só staff). |
| `GET /orders/:number` | sessão | Dono ou staff. Aceita número ou id. |
| `PATCH /orders/:number/status` | staff | `status`, `note?`, `responsible?`, `location?`, `notify?` (defeito `true`: avisa o cliente) |

**`POST /orders`:**

```json
{
  "items": [{ "id": "prod-01", "quantity": 2 }],
  "customer": { "name": "…", "email": "…", "phone": "+244 9…", "nif": null },
  "shippingMode": "sea_lcl",
  "deliveryMethod": "pickup",
  "paymentMethod": "bank_transfer",
  "addressId": "…",
  "address": { "municipality": "…", "street": "…", "province": "Luanda" }
}
```

- `shippingMode`: `sea_lcl` (marítimo) ou `air_exp` (aéreo).
- `deliveryMethod`: `pickup` (Terminal TradeX, grátis), `delivery_luanda` ou `delivery_interprovincial` (estes dois exigem morada, via `addressId` de uma morada guardada, ou `address`).
- Os preços enviados pelo cliente são ignorados: o servidor calcula subtotal, frete, seguro, entrega e total.
- `paymentMethod` tem de estar activo (por defeito só `bank_transfer`).

**Estados da encomenda:** `AWAITING_PAYMENT`, `PAYMENT_CONFIRMED`, `PROCESSING_SUPPLIER`, `IN_INTERNATIONAL_TRANSIT`, `ARRIVED_IN_ANGOLA`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `RETURNED`.

## Pagamentos

| Método e rota | Acesso | Descrição |
|---|---|---|
| `GET /payments/config` | público | Métodos activos e dados bancários |
| `GET /payments` | sessão | Cliente: os seus. Staff: todos. |
| `POST /payments/:orderNumber/proof` | opcional | **Multipart**: `file` (PDF, JPG ou PNG, até 5 MB), `reference?`, `email?`. Com sessão, tem de ser o dono; sem sessão, `email` tem de ser o da compra. Passa o pagamento a `REVIEW_PENDING`. Pode ser reenviado enquanto não estiver aprovado. |
| `GET /payments/:id/proof` | staff | Devolve o ficheiro do comprovativo |
| `POST /payments/:id/review` | staff | `{ "approved": true/false, "note"?: "motivo" }`. Aprovar passa a encomenda a `PAYMENT_CONFIRMED`; rejeitar guarda o motivo, visível ao cliente. |
| `POST /payments/webhook` | segredo | Para um futuro gateway. Cabeçalho `x-webhook-secret`; 503 enquanto `PAYMENT_WEBHOOK_SECRET` não existir. |

**Estados do pagamento:** `PENDING`, `REVIEW_PENDING`, `APPROVED`, `DECLINED`, `REFUNDED`.

O tipo do ficheiro é verificado pelo conteúdo (primeiros bytes), não pela extensão.

## Rastreio

| Método e rota | Acesso | Descrição |
|---|---|---|
| `POST /tracking/lookup` | opcional | `{ "code": "TDX-AO-2026-0001", "email": "…" }`. Exige um segundo factor: sessão do dono, sessão de staff, ou o e-mail da compra. "Código inexistente" e "e-mail errado" dão a mesma resposta 404. Não devolve dados pessoais. |

O e-mail vai no corpo do pedido, nunca no URL.

## Backoffice (`/admin`, staff)

Todas as rotas de `/admin` exigem staff. As marcadas *admin* exigem administrador.

**Indicadores**

| Rota | Descrição |
|---|---|
| `GET /admin/analytics` | Faturação, encomendas, em trânsito, pagamentos por validar, vendas por categoria |
| `GET /admin/analytics/customers?days=30` | Clientes registados e que compraram, convidados vs. contas, convidados que criaram conta, carrinhos abandonados (sem compra há mais de 24 h) |
| `GET /admin/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Recebido, por validar, a aguardar transferência, rejeitados (defeito: últimos 30 dias) |

**Utilizadores**

| Rota | Descrição |
|---|---|
| `GET /admin/users` | Filtros `search` e `segment` (`customers`, `buyers`, `non_buyers`, `staff`) |
| `PATCH /admin/users/:id` — *admin* | `active?`, `role?`. Revoga as sessões abertas da conta. Ninguém altera a própria conta. |

**Fornecedores e lotes de envio**

| Rota | Descrição |
|---|---|
| `GET /admin/suppliers` · `POST /admin/suppliers` · `PUT /admin/suppliers/:id` | Fornecedores na China (nome, província, categorias, contacto, e-mail, WeChat, WhatsApp, termos, avaliação, notas, `active`) |
| `GET /admin/shipments` | Lotes do agente parceiro, com as encomendas associadas |
| `POST /admin/shipments` · `PUT /admin/shipments/:code` | `title`, `transportMode` (`AIR`/`SEA`), `agentReference?`, `origin`, `destination`, `departedAt?`, `etaAt?`, `volumeWeight?` |
| `POST /admin/shipments/:code/orders` | `{ "orderNumbers": [...] }`. Só encomendas já pagas. |
| `DELETE /admin/shipments/:code/orders/:number` | Retira uma encomenda do lote |
| `POST /admin/shipments/:code/status` | `status`: `DRAFT`, `ORIGIN_WAREHOUSE`, `INTERNATIONAL_TRANSIT`, `ARRIVED`, `DISTRIBUTION`, `DELIVERED`. `INTERNATIONAL_TRANSIT` e `ARRIVED` actualizam também as encomendas do lote (e avisam os clientes). |

**Configurações e ficheiros**

| Rota | Descrição |
|---|---|
| `GET /admin/settings/:key` | `shipping`, `bank`, `payments` ou `cms` |
| `PUT /admin/settings/:key` — *admin* (`cms`: staff) | Valida o formato de cada chave |
| `POST /admin/uploads` | **Multipart** `file`: imagem JPG, PNG ou WEBP até 4 MB. Devolve `{ "url" }` pública (`/uploads/…`). |

**WhatsApp e notificações**

| Rota | Descrição |
|---|---|
| `GET /admin/integrations` | O que está activo (WhatsApp, webhook, modelo, e-mail, assistente) |
| `GET /admin/notifications?limit=50` | Histórico de notificações enviadas |
| `POST /admin/notifications/send` | `{ "orderNumber", "message" }`: mensagem manual ao cliente (WhatsApp + e-mail) |
| `GET /admin/conversations?status=` | `BOT`, `HUMAN` ou `CLOSED`. As não lidas vêm primeiro. |
| `GET /admin/conversations/:id` | Mensagens da conversa (marca como lida) |
| `POST /admin/conversations/:id/reply` | `{ "text" }`. Só nas 24 h seguintes à última mensagem do cliente (409 depois). |
| `POST /admin/conversations/:id/status` | `{ "status": "BOT" \| "HUMAN" \| "CLOSED" }` |

## Webhook do WhatsApp

| Método e rota | Descrição |
|---|---|
| `GET /webhooks/whatsapp` | Verificação feita pela Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| `POST /webhooks/whatsapp` | Mensagens e recibos de entrega. A assinatura `X-Hub-Signature-256` é validada sobre o corpo bruto; responde 200 logo e processa em segundo plano. Mensagens repetidas (mesmo id) são ignoradas. |

## Ficheiros públicos

`GET /uploads/<ano>/<ficheiro>`: imagens de produtos e banners enviadas pelo backoffice. Os comprovativos **não** são públicos: só `GET /payments/:id/proof`, para staff.
