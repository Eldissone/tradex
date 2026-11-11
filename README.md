# TradeX Global Trading

Plataforma de comércio internacional China ➔ Angola: loja online com preços em Kwanzas, encomendas com entrega porta a porta, pagamento por transferência bancária com comprovativo, backoffice operacional e atendimento por WhatsApp com assistente de IA.

| Parte | Tecnologia |
|---|---|
| Loja e backoffice (`frontend/`) | HTML + JavaScript (módulos ES, sem framework) empacotado com Vite |
| API (`backend/`) | Node.js 22, Express 5, Zod |
| Base de dados | PostgreSQL com Prisma 6 |
| Autenticação | JWT + bcrypt |
| Assistente WhatsApp | WhatsApp Business Cloud API + Claude (Anthropic SDK) |

## Pré-requisitos

- Node.js 22 ou superior
- PostgreSQL 16 ou superior instalado localmente (o Docker não é usado)

## Primeiro arranque

**1. Criar a base de dados** (ajuste o nome e a palavra-passe):

```sql
CREATE USER tradex WITH PASSWORD 'escolha-uma-palavra-passe';
CREATE DATABASE tradex OWNER tradex;
```

**2. Configurar a API.** Copie o exemplo e edite `backend/.env`:

```powershell
Copy-Item backend/.env.example backend/.env
```

Valores a preencher antes de arrancar:

| Variável | O que pôr |
|---|---|
| `DATABASE_URL` | `postgresql://tradex:<palavra-passe>@localhost:5432/tradex?schema=public` |
| `JWT_SECRET` | Texto aleatório com 32+ caracteres. Gerar: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Conta de administrador criada no arranque. **Mude a palavra-passe do exemplo.** |

Todas as variáveis estão descritas em [docs/configuracao.md](docs/configuracao.md).

**3. Instalar, criar tabelas e dados iniciais:**

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
```

**4. Arrancar** (dois terminais):

```powershell
npm run dev:backend    # API em http://localhost:3000
npm run dev:frontend   # Loja em http://localhost:5174
```

Verificação: `http://localhost:3000/api/v1/health` deve responder `"database": "connected"`.

### Contas

| Conta | Origem | Acesso |
|---|---|---|
| Administrador | `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `backend/.env` | `http://localhost:5174/admin` |
| Cliente de demonstração | `SEED_DEMO_CUSTOMER_EMAIL` / `_PASSWORD` (só em desenvolvimento) | Área do cliente |

O administrador é criado no arranque da API se ainda não existir. Alterar `ADMIN_PASSWORD` no `.env` **não** muda a palavra-passe de uma conta já criada.

## Páginas

| Página | Para quê |
|---|---|
| `/` | Página inicial, destaques, simulador, FAQ |
| `catalogo` | Catálogo com filtro por categoria (`?categoria=solar`) |
| `produto?id=…` | Detalhe do produto |
| `checkout` | Finalizar compra (com conta ou como convidado) |
| `rastreio` | Estado da encomenda (código + e-mail da compra, ou com sessão) |
| `cliente` | Área do cliente: encomendas, pagamentos, moradas, favoritos |
| `redefinir-password` | Nova palavra-passe a partir do link enviado por e-mail |
| `admin` | Backoffice (contas ADMIN e STAFF) |

## Estrutura

```text
frontend/
  *.html              Páginas (entradas do Vite, ver vite.config.js)
  js/                 Módulos por página + api.js (cliente da API), auth.js (sessão),
                      cart.js, nav.js (menu partilhado), shipping-config.js, proof-upload.js,
                      admin*.js (backoffice)
  css/styles.css      Estilos
backend/
  prisma/             schema.prisma, migrations/, seed.js
  src/
    app.js, server.js
    config/           env.js (validação do .env), shipping.js (valores por defeito)
    application/      Regras partilhadas: criação de encomendas, conversas WhatsApp
    infrastructure/   database, auth (JWT/bcrypt), settings, storage (ficheiros),
                      notifications (WhatsApp, e-mail), assistant (Claude)
    presentation/     routes/, middlewares/ (auth, limite de tentativas, erros), serializers.js
  test/               Testes automáticos
  storage/            Ficheiros enviados (ignorado pelo Git; ver docs/operacao.md)
docs/
  configuracao.md     Variáveis de ambiente
  operacao.md         Guia do backoffice e rotinas
  api/README.md       Referência da API
  architecture/       Arquitectura
  workflows/          Plano de implementação e estado
```

## Comandos

```powershell
npm run dev:backend            # API com recarga automática
npm run dev:frontend           # Vite em modo de desenvolvimento
npm run build                  # Build da loja (frontend/dist)
npm test                       # Testes da API (ver abaixo)
npm run db:generate            # Gera o cliente Prisma
npm run db:deploy              # Aplica migrações existentes
npm run db:migrate -- --name descricao   # Cria uma migração nova (desenvolvimento)
npm run db:seed                # Repõe categorias, produtos, fornecedores e lotes de exemplo
```

### Testes

`npm test` corre os testes do assistente WhatsApp com um cliente Claude simulado (não gasta créditos) e valida a assinatura do webhook. Precisam da base de dados com o seed aplicado (o teste do catálogo lê produtos reais). O teste da assinatura só corre com `WHATSAPP_APP_SECRET` definido.

## Funcionamento resumido

- **Encomenda:** `AWAITING_PAYMENT` → `PAYMENT_CONFIRMED` → `PROCESSING_SUPPLIER` → `IN_INTERNATIONAL_TRANSIT` → `ARRIVED_IN_ANGOLA` → `READY_FOR_PICKUP` ou `OUT_FOR_DELIVERY` → `DELIVERED` (ou `CANCELLED`).
- **Pagamento:** só por transferência bancária. O cliente envia o comprovativo (PDF, JPG ou PNG até 5 MB); a tesouraria aprova ou rejeita no backoffice.
- **Preços:** calculados sempre no servidor a partir da base de dados e das configurações (prazos, frete, seguro, taxas de entrega).
- **Notificações:** WhatsApp e e-mail em cada marco da encomenda. Sem credenciais, os envios ficam registados como "simulado".
- **Assistente WhatsApp:** responde, consulta encomendas, cria encomendas e passa à equipa quando necessário. Sem `ANTHROPIC_API_KEY`, as conversas vão directamente para a equipa.

## Problemas frequentes

| Sintoma | Causa e solução |
|---|---|
| A API fecha ao arrancar com "Configuração inválida no .env" | Falta uma variável obrigatória (`DATABASE_URL`, `JWT_SECRET` com 32+ caracteres) ou tem um valor inválido. A mensagem indica qual. |
| `/health` responde `"database": "offline…"` | PostgreSQL parado ou `DATABASE_URL` errada. |
| Erro 500 depois de uma migração ou de `db:generate` | O servidor da API continua com o cliente Prisma antigo. Reinicie `npm run dev:backend`. |
| `EPERM … query_engine-windows.dll.node` ao gerar o Prisma (Windows) | O motor está em uso pela API. Pare a API, corra `npm run db:generate` e volte a arrancar. |
| Login do administrador falha | A conta já existia com outra palavra-passe. Altere-a pelo perfil, ou por "Esqueceu-se" (o link aparece no log da API enquanto não houver SMTP). |
| A loja mostra "Não foi possível contactar o servidor" | A API não está a correr, ou o endereço da API é diferente. Defina `VITE_API_URL` em `frontend/.env` (ex.: `VITE_API_URL=http://localhost:3000/api/v1`). |

## Antes de pôr em produção

Lista em [docs/operacao.md](docs/operacao.md#antes-de-produção). Resumo: palavra-passe do administrador e `JWT_SECRET` novos, `NODE_ENV=production`, HTTPS, `CORS_ORIGIN` e `PUBLIC_SITE_URL` com o domínio real, cópias de segurança da base de dados e de `backend/storage`, e as credenciais de WhatsApp, SMTP e Anthropic.
