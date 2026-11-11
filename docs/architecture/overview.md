# Arquitectura TradeX

Monólito modular: uma API REST (Express + Prisma + PostgreSQL) e um frontend de páginas HTML com módulos JavaScript (Vite). Não há filas nem serviços separados; tudo o que é assíncrono (notificações, webhook do WhatsApp) corre em segundo plano dentro do mesmo processo.

```text
Navegador (loja + backoffice)  ──HTTP/JSON──►  API Express  ──Prisma──►  PostgreSQL
                                                  │  ▲
                              Meta WhatsApp ◄─────┤  └── webhook (mensagens recebidas)
                              SMTP (e-mail) ◄─────┤
                              API Anthropic ◄─────┘   (assistente)
                              backend/storage ◄── ficheiros (comprovativos, imagens)
```

## Organização do código

| Pasta | Função |
|---|---|
| `backend/src/presentation/routes` | Rotas HTTP, validação de entrada (Zod) e permissões. Um ficheiro por área. |
| `backend/src/presentation/middlewares` | Autenticação e papéis, limite de tentativas, tratamento de erros |
| `backend/src/presentation/serializers.js` | Converte registos Prisma para o formato que o frontend consome |
| `backend/src/application` | Regras usadas por mais de um ponto de entrada: criação de encomendas (loja e WhatsApp) e conversas WhatsApp |
| `backend/src/infrastructure` | Base de dados, autenticação (JWT, bcrypt), configurações, armazenamento de ficheiros, notificações (WhatsApp, e-mail), assistente (Claude) |
| `backend/src/config` | Validação do `.env` e valores por defeito de envio |

As pastas `domain/`, `application/{dtos,interfaces,use-cases}`, `presentation/{controllers,validators}`, `infrastructure/{repositories,payments,logistics}` e `shared/` existem desde o arranque do projecto mas estão **vazias**: nenhum código as usa. A lógica de negócio está nas rotas, em `application/` e em `infrastructure/`. Se o projecto crescer, é aí que faz sentido extrair casos de uso; até lá, não são necessárias.

Frontend: cada página `*.html` carrega o seu módulo em `frontend/js/` (`catalogo.js`, `checkout.js`, …). Módulos partilhados: `api.js` (todos os pedidos à API), `auth.js` (sessão e cache dos dados da conta), `cart.js`, `nav.js` (menu), `shipping-config.js`, `product-store.js`, `proof-upload.js`. O backoffice está em `admin.js`, `admin-extra.js` e `admin-conversations.js`.

## Modelo de dados

| Modelo | Conteúdo |
|---|---|
| `User`, `Customer`, `Address`, `PasswordResetToken` | Contas (`CUSTOMER`/`STAFF`/`ADMIN`), dados do cliente, moradas, tokens de redefinição (guarda-se só o hash) |
| `Category`, `Product`, `Supplier` | Catálogo; cada produto pode ter um fornecedor na China |
| `Cart`, `CartItem` | Carrinho guardado de clientes com sessão |
| `Order`, `OrderItem` | Encomenda com os dados do cliente no momento da compra (também para convidados), custos discriminados e canal (`WEB`, `WHATSAPP`, `ADMIN`) |
| `Payment` | Pagamento da encomenda, com o comprovativo (caminho, tipo, tamanho), quem validou e o motivo de rejeição |
| `Shipment` | Lote de envio do agente parceiro; várias encomendas apontam para o mesmo lote |
| `TrackingEvent` | Histórico visível ao cliente (um evento por mudança de estado) |
| `Notification` | Registo de cada WhatsApp/e-mail enviado ou simulado |
| `Conversation`, `ConversationMessage` | Conversas WhatsApp: estado (`BOT`/`HUMAN`/`CLOSED`), histórico visível à equipa e histórico técnico do assistente |
| `Setting` | Configurações editáveis (`shipping`, `bank`, `payments`, `cms`) em JSON |

Valores monetários em `Decimal(14,2)`, expostos como inteiros em Kwanzas. As migrações estão em `backend/prisma/migrations`.

O estado da encomenda, o do pagamento e o do lote de envio são ciclos distintos: o lote só propaga à encomenda os marcos comuns a todas (enviado, chegou a Angola); levantamento, entrega ao domicílio e entrega são decididos encomenda a encomenda.

## Fluxos principais

**Compra.** `POST /orders` valida os produtos, calcula tudo no servidor (subtotal, frete por modalidade, seguro, taxa de entrega, a partir de `Setting`) e cria, numa só transacção, a encomenda, os itens, o pagamento `PENDING` e o primeiro evento de rastreio. O número segue `TDX-AO-<ano>-<sequência>`. Depois dispara a notificação "encomenda registada".

**Pagamento.** O cliente transfere e envia o comprovativo (`POST /payments/:n/proof`). O ficheiro é validado pelo conteúdo, gravado em `backend/storage/payment-proofs` com nome aleatório e o pagamento passa a `REVIEW_PENDING`. A tesouraria abre o ficheiro (só staff) e aprova ou rejeita; aprovar move a encomenda para `PAYMENT_CONFIRMED`; rejeitar guarda o motivo e o cliente pode reenviar.

**Lotes.** A equipa associa encomendas pagas a um lote. Ao marcar o lote como enviado ou chegado a Angola, cada encomenda do lote muda de estado, ganha um evento de rastreio e o cliente é avisado.

**Notificações.** `notifyOrderEvent` (em `infrastructure/notifications`) monta a mensagem e envia por e-mail e WhatsApp. No WhatsApp, usa texto livre se o cliente escreveu nas últimas 24 h e o modelo aprovado caso contrário. Nunca lança erro a quem a chama: falhas ficam em `Notification`. Sem credenciais, o estado é `SIMULATED`.

**Assistente WhatsApp.**
1. A Meta chama `POST /webhooks/whatsapp`; a assinatura é verificada sobre o corpo bruto e a API responde 200 logo.
2. As mensagens de cada número entram numa fila (uma de cada vez) e são deduplicadas pelo id da mensagem.
3. Se a conversa está com a equipa (`HUMAN`), só fica registada e marcada como não lida.
4. Se está com o assistente, corre o ciclo de ferramentas do Claude (`infrastructure/assistant`): pesquisar produtos, estado de encomendas, informação de envio e pagamento, criar encomenda, passar a uma pessoa. As instruções ficam em cache; o histórico da sessão só cresce (nova sessão após 24 h sem mensagens).
5. Se pedir uma pessoa, ou o modelo recusar, ou houver erro, a conversa passa a `HUMAN`. Sem `ANTHROPIC_API_KEY`, passa sempre à equipa com uma resposta automática.

O assistente só vê encomendas do número que está a escrever (ou com o e-mail da compra) e só cria encomendas depois de o cliente confirmar. Os preços vêm sempre da base de dados.

## Segurança

- Senhas com bcrypt (custo 12); sessões JWT; mudar a palavra-passe, desactivar a conta ou mudar o papel revoga as sessões anteriores (`passwordChangedAt`).
- Rotas de escrita do backoffice exigem `STAFF` ou `ADMIN`; configurações e contas exigem `ADMIN`.
- Rastreio e comprovativos de convidados exigem o e-mail da compra; os números de encomenda são sequenciais, por isso nunca bastam sozinhos.
- Limite de tentativas em login, registo, recuperação, rastreio e envio de comprovativos (em memória; com várias instâncias da API passaria para um armazenamento partilhado).
- Ficheiros: tipo verificado pelo conteúdo, limites de tamanho, comprovativos fora de qualquer pasta pública, imagens públicas servidas com `nosniff`.
- Webhooks: WhatsApp com HMAC-SHA256, pagamentos com segredo comparado em tempo constante; ambos desligados sem segredo configurado.
- Tokens de redefinição guardados só como hash, uso único, validade de 1 hora.
- Mensagens de erro iguais para "não existe" e "sem acesso" onde isso evita revelar dados.

## Decisões

- Pagamento por transferência bancária com comprovativo, porque ainda não há licença do gateway Multicaixa. O código dos métodos Multicaixa fica preparado mas desligado (`payments.enabledMethods`).
- O transporte China ➔ Angola é do agente parceiro. O cliente só vê modalidade, estado, linha temporal e previsão; não há alfândega, navios nem contentores no produto.
- Prazos, frete, seguro, taxas de entrega e dados bancários vivem na base de dados e editam-se no backoffice, sem alterar código.
- As configurações por defeito vivem em `backend/src/config/shipping.js` e `frontend/js/shipping-config.js` (este só para a primeira renderização antes de a API responder).

## Limitações conhecidas

- Sem envio real de WhatsApp, e-mail ou assistente até haver credenciais (ver [configuracao.md](../configuracao.md)).
- Sem analytics de visitantes (visitas, origem do tráfego): só se mede o que passa pela conta, carrinho e encomenda.
- Fotos de produtos e banners ficam em `backend/storage/public-uploads` no disco do servidor; com mais de um servidor seria preciso armazenamento partilhado.
- Só 6 testes automáticos; o resto foi verificado manualmente.
- Fase 6 (parceiro transportador, "malas") não está feita; ver [plano](../workflows/plano-implementacao-reuniao-2026-11.md).
