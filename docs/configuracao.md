# Configuração

A API lê `backend/.env` ao arrancar e valida tudo com Zod ([backend/src/config/env.js](../backend/src/config/env.js)). Se faltar algo obrigatório ou houver um valor inválido, fecha de imediato e indica a variável. O modelo está em [backend/.env.example](../backend/.env.example).

> **Linhas vazias:** para as variáveis de texto livre (tokens, SMTP, etc.), `VARIAVEL=` vazio equivale a "não definida". Mas `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_SITE_URL`, `SEED_DEMO_CUSTOMER_EMAIL` e `SEED_DEMO_CUSTOMER_PASSWORD` são validadas (e-mail, URL, comprimento): se não as quiser usar, **apague a linha** em vez de a deixar vazia.

## Obrigatórias

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Ligação PostgreSQL, ex.: `postgresql://tradex:senha@localhost:5432/tradex?schema=public` |
| `JWT_SECRET` | Segredo de assinatura das sessões, 32+ caracteres. Mudá-lo termina todas as sessões abertas. |

## Servidor

| Variável | Defeito | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | `production` desliga a conta cliente de demonstração do seed e o log do link de recuperação de palavra-passe. |
| `PORT` | `3000` | Porta da API. |
| `CORS_ORIGIN` | `http://localhost:5174` | Origem da loja autorizada a chamar a API (uma só). Também serve de endereço da loja nos links, se `PUBLIC_SITE_URL` não existir. |
| `PUBLIC_SITE_URL` | — | Endereço público da loja, usado nos links de e-mails e mensagens (rastreio, redefinição de palavra-passe). Em produção, defina-o. |
| `JWT_EXPIRES_IN` | `7d` | Validade da sessão (ex.: `12h`, `7d`). |

Localmente também são aceites as origens `http://localhost:5173/5174` e `http://127.0.0.1:5173/5174`.

## Contas

| Variável | Descrição |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 8) | Conta ADMIN criada no arranque se ainda não existir. Sem estas duas, nenhum administrador é criado. |
| `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_PHONE` | Dados da conta de administrador (defeitos: `Administrador`, `TradeX`). |
| `SEED_DEMO_CUSTOMER_EMAIL`, `SEED_DEMO_CUSTOMER_PASSWORD` (mín. 6) | Cliente de demonstração criado por `npm run db:seed`. Ignorado com `NODE_ENV=production`. |

## Pagamentos

| Variável | Descrição |
|---|---|
| `PAYMENT_WEBHOOK_SECRET` | Segredo do webhook de um gateway de pagamento (`POST /payments/webhook`, cabeçalho `x-webhook-secret`). Vazio = webhook desligado (503). Reservado para uma futura integração (PayGo ou Multicaixa). |

Os métodos de pagamento activos e os dados bancários **não** estão no `.env`: editam-se no backoffice (Configurações) e ficam na base de dados. Por defeito só há transferência bancária.

## WhatsApp (Meta Cloud API)

Sem credenciais, os envios são **simulados**: ficam registados no histórico mas não saem.

| Variável | Defeito | Descrição |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | — | Token de acesso da Cloud API. |
| `WHATSAPP_PHONE_NUMBER_ID` | — | ID do número emissor. Com o token, activa o envio real. |
| `WHATSAPP_VERIFY_TOKEN` | — | Texto à sua escolha, repetido na configuração do webhook na Meta. |
| `WHATSAPP_APP_SECRET` | — | Segredo da aplicação Meta. Serve para validar a assinatura (`X-Hub-Signature-256`) de cada mensagem recebida. Sem ele, o webhook responde 503. |
| `WHATSAPP_GRAPH_VERSION` | `v21.0` | Versão da Graph API. |
| `WHATSAPP_TEMPLATE_ORDER_UPDATE` | — | Nome do modelo aprovado pela Meta para avisos fora da janela de 24 h. O modelo deve ter 3 parâmetros de corpo, por ordem: primeiro nome, número da encomenda, resumo. Sem modelo, os avisos só chegam a quem escreveu nas últimas 24 h. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `pt_PT` | Idioma do modelo. |

**Configurar o webhook na Meta:** URL de chamada `https://<domínio>/api/v1/webhooks/whatsapp`, token de verificação igual a `WHATSAPP_VERIFY_TOKEN`, e subscrever o campo `messages`.

## E-mail (SMTP)

Sem `SMTP_HOST`, os e-mails são simulados.

| Variável | Defeito | Descrição |
|---|---|---|
| `SMTP_HOST` | — | Servidor SMTP. |
| `SMTP_PORT` | `587` | Porta (465 usa TLS directo). |
| `SMTP_USER`, `SMTP_PASS` | — | Credenciais, se o servidor as exigir. |
| `MAIL_FROM` | `TradeX Global <no-reply@tradex.ao>` | Remetente. |

## Assistente de IA (Claude)

| Variável | Defeito | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Chave da API Anthropic. Sem ela, o assistente fica desligado: cada conversa recebe uma resposta automática e passa à equipa. |
| `ASSISTANT_MODEL` | `claude-opus-5-5` | Modelo usado. Para modelos que o permitem (`claude-opus-5-5`, `claude-opus-5`, `claude-fable-5-1`, `claude-sonnet-5-5`) activa-se a re-tentativa noutro modelo em caso de recusa. |
| `ASSISTANT_EFFORT` | `low` | Profundidade de raciocínio: `low`, `medium`, `high`, `xhigh` ou `max`. Mais alto = respostas mais lentas e mais caras. |

## Frontend

O Vite lê variáveis de `frontend/.env` (não do `.env` da raiz nem do da API):

| Variável | Defeito | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api/v1` | Endereço da API. Em produção, defina-o antes do `npm run build`. |

## Configurações guardadas na base de dados

Editam-se em **Backoffice → Configurações** (apenas administradores) e não exigem reiniciar a API:

| Chave | Conteúdo |
|---|---|
| `shipping` | Prazos mínimo/máximo e % de frete por modalidade (marítimo, aéreo), % de seguro de carga, taxas de entrega (domicílio Luanda, interprovincial). |
| `bank` | Titular e contas bancárias (banco + IBAN) mostradas no checkout. |
| `payments` | Métodos de pagamento activos. |
| `cms` | Conteúdos públicos (destaques, banners, FAQ). Editável também pela equipa (STAFF). |

Se uma chave ainda não existir, a API usa os valores por defeito de [backend/src/config/shipping.js](../backend/src/config/shipping.js) e de [backend/src/infrastructure/settings.js](../backend/src/infrastructure/settings.js).
