# Auditoria de segurança e controlo de acesso

Data: 2026-11-12. Âmbito: `backend/src`, `frontend/js`, configuração (`.env.example`, `.gitignore`), `docs/operacao.md` e `npm audit`.
Método: leitura de código. Nada foi explorado nem testado em execução, e o `.env` real não foi aberto.
Não revisto: `whatsapp-conversations.js`, `assistant/*`, `settings.js`, `serializers.js` e o schema Prisma.

Legenda: ✅ conforme · ⚠️ parcial · ❌ em falta

## Correcções aplicadas (2026-11-12)

- **C1/C2 (XSS):** novo helper [esc.js](../frontend/js/esc.js); escape aplicado a todos os dados da API nos templates de `app.js`, `catalogo.js`, `produto.js`, `cliente.js`, `rastreio.js`, `checkout.js` e `admin.js` (Visão Geral, produtos, pagamentos, CMS). Verificado só por carga das páginas sem erros de consola; não foi feito teste de exploração com payload.
- **M5 (parcial):** limites de tamanho nos campos de cliente/morada de `POST /orders` e em título/descrição/specs de produto; `image`/`images[].url` só aceitam `http(s)://` ou `/…`.
- **A5 (parcial):** `npm audit fix` corrigiu o `multer`. Restam 3 avisos em `prisma`/`deepmerge-ts` (ferramenta de build), que exigem actualização do Prisma.
- **A6:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SEED_DEMO_CUSTOMER_PASSWORD` ficam vazios no `.env.example`.
- **A4 (auditoria):** tabela `AuditLog` (migração `20261112100000_audit_log`) e middleware [audit.js](../backend/src/presentation/middlewares/audit.js): escritas de staff/admin, logins falhados e 401/403/429, com retenção de 12 meses.
- **A2 (CSP):** cabeçalhos no `vite preview`; em produção têm de ser replicados no proxy (ver `docs/operacao.md`). Mantém `'unsafe-inline'` nos scripts por causa dos `onerror` inline.
- **A3:** `TRUST_PROXY`, redirect HTTPS e HSTS em produção; CORS sem localhost em produção (M7).
- **M1 (parcial):** rate limit de 20 encomendas/hora por IP em `POST /orders`.
- **M2/M3 (parcial):** comparação bcrypt falsa quando o e-mail não existe; JWT fixado em HS256.
- **Por fazer:** A1 (token em cookie HttpOnly), M1 restante (admin, por conta), M4, M6, M8 (backups) e monitorização (Sentry/alertas).

## Resumo

| # | Área | Estado |
|---|------|--------|
| 1 | Autenticação (tokens) | ⚠️ |
| 2 | Hashing de palavras-passe | ✅ |
| 3 | RBAC | ⚠️ |
| 4 | Validação de entradas | ⚠️ |
| 4a | SQL Injection | ✅ |
| 4b | XSS | ❌ |
| 4c | CSRF | ✅ (não aplicável, ver nota) |
| 5 | Rate limiting | ⚠️ |
| 5a | HTTPS obrigatório | ❌ |
| 5b | Endpoints administrativos | ⚠️ |
| 6 | Variáveis de ambiente e segredos | ⚠️ |
| 7 | Registo de operações administrativas | ❌ |
| 8 | Backups e retenção | ⚠️ |
| 9 | Monitorização de erros e actividade suspeita | ❌ |

## Achados por prioridade

### Crítico

**C1. XSS armazenado: um convidado consegue executar código no backoffice.**
- [admin.js:223](../frontend/js/admin.js) monta `desc: \`Cliente: ${o.customer?.name} ...\`` e [admin.js:~238](../frontend/js/admin.js) injecta-o com `innerHTML` (`<p class="activity-desc">${act.desc}</p>`).
- `customer.name` vem de `POST /orders`, que é público e sem sessão. A validação só exige `min(1)` (orders.routes.js:32), sem limite máximo nem sanitização.
- Cenário: um atacante cria uma encomenda com nome `<img src=x onerror=...>`. Quando um admin abre a Visão Geral, o código corre no origin do backoffice, lê o JWT do `localStorage` (`tradex_auth_token_v1`) e fica com a conta de ADMIN.
- Correcção: escapar com `escapeHtml` e, como defesa em profundidade, aplicar CSP (ver A2) e limites de tamanho nos campos.

**C2. Muitas outras interpolações em `innerHTML` sem escape.** Os dados vêm de staff ou do próprio cliente:
- Títulos de produto em `app.js:60,65,268`, `catalogo.js:58,62,225`, `produto.js:164,168` e `cliente.js:198-200,369-373`.
- Moradas em `cliente.js:341-342` e notas de rastreio em `rastreio.js:134`.
- IBANs em `rastreio.js:235` e `cliente.js:581`.
- Atributos `src`/`alt` em `produto.js:79` e `checkout.js:122`. Uma aspa em `alt="${...}"` permite quebrar o atributo.
- Impacto: um utilizador STAFF (ou uma conta staff comprometida) edita o título de um produto ou o CMS e executa XSS em todos os visitantes e em admins. Isto é uma escalada de STAFF para ADMIN.
- Correcção: um único helper `esc()` em `frontend/js/` usado em todos os templates, e validar o esquema (`https:` ou `/uploads/`) em `image`/`images[].url`.

### Alto

**A1. Token de sessão em `localStorage`.** Qualquer XSS rouba-o. Com C1/C2 corrigidos o risco baixa, mas o ideal é um cookie `HttpOnly; Secure; SameSite=Lax`, e nesse caso passa a ser obrigatório CSRF (ver nota).

**A2. Sem Content-Security-Policy na loja.** O `helmet()` está só na API. As páginas HTML em `frontend/` não definem CSP (nem `<meta>`), nem `frame-ancestors`/`X-Frame-Options`. É preciso configurá-la no servidor/proxy que serve o `dist/`. Os `onerror="..."` inline (admin.js:513, checkout.js:122) obrigam a `unsafe-inline` ou a serem removidos.

**A3. HTTPS não é imposto pela aplicação.**
- Não há redirect http→https, `app.set('trust proxy', …)` nem HSTS explícito.
- Atrás de um proxy, `req.ip` será o IP do proxy. Todos os utilizadores partilham então o mesmo balde do rate limit (um atacante bloqueia os logins legítimos).
- Se `trust proxy` for definido de forma larga demais, o `X-Forwarded-For` é falsificável e o limite contorna-se.
- Está só como checklist em `docs/operacao.md:128`. Falta o passo concreto (Caddy/Nginx com TLS, `trust proxy` = nº de saltos, redirect 301, HSTS `max-age` ≥ 6 meses).

**A4. Sem registo de auditoria.** Não existe modelo nem tabela de auditoria (pesquisa "audit" sem resultados). Criar/eliminar utilizadores, alterar papéis, eliminar encomendas/produtos/fornecedores/lotes, alterar taxas e dados bancários, e anexar documentos não deixam rasto de quem fez o quê. Só há:
- `reviewedBy` nos pagamentos;
- `responsible` nos eventos de rastreio;
- o log HTTP do `morgan`, sem identificação do utilizador.

Em particular, `PUT /admin/settings/bank` (alterar o IBAN para onde os clientes pagam) é o vector de fraude mais lucrativo e não tem rasto. Falta uma tabela `AuditLog` (actor, acção, entidade, antes/depois, IP, data) escrita por um middleware nas rotas de escrita de `/admin`, `/orders`, `/products` e `/payments`.

**A5. Dependências com vulnerabilidades (`npm audit --omit=dev`: 4 altas).**
- `multer` 2.0.0–2.4.0: DoS (GHSA-q7qp-rjg7-q26m). É usado nos uploads de comprovativos, documentos e imagens.
- `deepmerge-ts` → `@prisma/config` → `prisma`: exaustão de pilha (ferramenta de build, risco baixo em runtime).
- Correcção: `npm audit fix`, depois repetir os testes de upload.

**A6. Credenciais por defeito em `backend/.env.example`.** `ADMIN_PASSWORD=tradexadmin2026` e `SEED_DEMO_CUSTOMER_PASSWORD=tradex2026` são públicas. Se alguém copiar o ficheiro para produção sem as trocar, o `bootstrapAdminUser` cria um ADMIN com essa palavra-passe. Deixar vazio (a aplicação já aceita) e fazer o arranque falhar em `NODE_ENV=production` se `ADMIN_PASSWORD` estiver na lista conhecida.

### Médio

**M1. Rate limiting incompleto.**
- ✅ Existe para login/registo/reset (20 em 15 min), recuperação (5 em 1 h), rastreio (30 em 15 min) e comprovativos (15 em 15 min).
- ❌ Falta em `POST /orders` (público: cria registos e dispara e-mails/WhatsApp, vector de spam e de enchimento da BD), em `/admin/*`, em `/me/*` e nos webhooks.
- O limite é só por IP. Não há bloqueio por conta (credential stuffing distribuído).
- Memória por processo: com mais de uma instância, o limite multiplica-se (já indicado no código).

**M2. Enumeração de contas.**
- `POST /auth/register` responde 409 "Já existe uma conta" (auth.routes.js:49).
- O login não faz `bcrypt.compare` quando o utilizador não existe, por isso a resposta é mais rápida para e-mails inexistentes (diferença de tempo).
- ✅ A recuperação de palavra-passe responde sempre da mesma forma.

**M3. JWT.**
- Dura 7 dias, não há refresh nem logout no servidor, e `jwt.verify` não fixa o algoritmo (usar `{ algorithms: ['HS256'] }`).
- ✅ Positivo: a cada pedido o utilizador e o papel são relidos da BD, por isso desactivar a conta ou mudar o papel tem efeito imediato. Mudar a palavra-passe revoga os tokens antigos (`passwordChangedAt`).
- Ressalva: `PATCH /admin/users/:id` actualiza `passwordChangedAt` em qualquer edição. Editar só o telefone de um utilizador desliga-lhe as sessões.

**M4. RBAC com granularidade grossa.**
- ✅ Três papéis. `/admin` exige `requireStaff` em todo o router, e criar/editar/eliminar utilizadores, alterar taxas/bancos/pagamentos e eliminar encomendas exigem `requireAdmin`. Há protecção contra o admin se desactivar/eliminar a si próprio.
- ⚠️ STAFF pode: listar todos os utilizadores com PII (`GET /admin/users`), editar o CMS (vector do C2), enviar mensagens e WhatsApp a clientes, eliminar produtos e fornecedores, e apagar documentos. Considerar permissões por recurso, ou pelo menos tornar `GET /users` e o CMS exclusivos de ADMIN.
- ⚠️ Não há trava para o "último ADMIN": rebaixar ou eliminar outro admin é possível, e o bloqueio é só sobre a própria conta.

**M5. Validação de entrada incompleta.** Zod está presente em todas as rotas de escrita (✅), mas faltam limites e formatos:
- `customer.name`, `phone`, `nif`, e os campos de morada em `POST /orders`, sem `max`.
- `productSchema`: `title`, `description`, `specs` sem `max`; `image`/`images[].url` aceitam qualquer string; `logistics`/`techSpecs` livres.
- `PUT /admin/settings/cms`: `z.record(z.any())` até ao limite de 2 MB do body.
- `GET /products/:id` e outras recebem `id` sem formato validado (apenas risco de ruído).
- Mass assignment: ✅ `zod.parse` descarta campos extra.

**M6. Host header.** `POST /admin/uploads` constrói o URL público com `req.get('host')` (admin.routes.js:658). Um pedido com `Host` falso grava um URL de imagem para o domínio errado. Usar `PUBLIC_SITE_URL`/`API_PUBLIC_URL` da configuração.

**M7. CORS.** As origens `localhost:5173/5174` e `127.0.0.1` estão sempre autorizadas, mesmo em produção. Como a autenticação é por `Authorization` header (não cookies), o impacto é baixo, mas convém filtrar por `NODE_ENV`.

**M8. Backups e retenção.**
- ✅ O comando `pg_dump` e a pasta `backend/storage` estão documentados (`docs/operacao.md:100-105`).
- ❌ Não há agendamento, retenção da cópia (ex.: 7 diárias + 4 semanais + 12 mensais), cifragem, cópia fora do servidor, nem teste de reposição realizado.
- ❌ Não há política de retenção de dados pessoais: encomendas de convidado, `Notification.body` (contém nome e mensagem), `PasswordResetToken` expirados e conversas WhatsApp ficam para sempre. A Lei 22/11 de Protecção de Dados Pessoais de Angola exige finalidade e prazo definidos, e canal para pedido de eliminação.

### Baixo / observações

- **B1.** `GET /health` expõe o ambiente e o estado da BD sem autenticação ("offline (fallback mode active)"). Reduzir para `{status:'ok'}` fora do desenvolvimento.
- **B2.** O 404 devolve `originalUrl` no JSON (reflexão inócua, mas desnecessária).
- **B3.** O token de verificação do webhook WhatsApp compara-se com `===` (whatsapp.routes.js:15). O resto das comparações de segredos usa `timingSafeEqual`, o que é bom.
- **B4.** A política de palavra-passe é só `min(8)`, sem verificação de palavras comuns. No registo não há limite máximo (o bcrypt trunca aos 72 bytes).
- **B5.** O token de recuperação antigo mantém-se válido quando se pede outro (1 h, uso único).
- **B6.** As exigências de `console.info` com o link de reset só correm fora de produção (✅), mas o `NODE_ENV` não está garantido como `production` no arranque.

## Conformidade por item pedido

### 1. Autenticação com sessões seguras ou tokens
JWT assinado com `JWT_SECRET` (mínimo 32 caracteres, validado no arranque, ✅). Vive em `localStorage` (A1), dura 7 dias sem logout no servidor (M3). A revogação por alteração de palavra-passe e a leitura do utilizador a cada pedido são pontos fortes.

### 2. Passwords com hashing robusto ✅
`bcryptjs` com 12 rondas (auth.js:6). Tokens de reset: 32 bytes aleatórios, só o hash SHA-256 fica na BD, expiram em 1 h e são de uso único. Melhoria opcional: migrar para argon2id. Garantir que `bcryptjs` não limita o rendimento do login (é JS puro, mais lento que o nativo `bcrypt`).

### 3. RBAC ⚠️
Ver M4. A verificação é sempre no servidor e relida da BD, o que é o correcto. O que falta é granularidade e a protecção do "último admin".

### 4. Validação, SQLi, XSS, CSRF
- **SQL Injection ✅.** Todo o acesso é por Prisma (parametrizado). O único `$queryRaw` (admin.routes.js:28) é um template literal sem variáveis, e `health` usa `SELECT 1`. Não existe `$queryRawUnsafe`/`$executeRawUnsafe`.
- **XSS ❌.** C1, C2 e A2. A API devolve JSON e os ficheiros privados saem com `nosniff`, o que é correcto. O problema está nos templates do frontend.
- **CSRF ✅ (não aplicável).** A autenticação usa cabeçalho `Authorization: Bearer`, que o browser não anexa automaticamente. Se se migrar para cookies (A1), é preciso adicionar `SameSite` + token CSRF.
- **Ficheiros ✅.** Tipo detectado por magic bytes (PDF/JPG/PNG/WEBP, SVG excluído), nome gerado com UUID, destino fora das pastas públicas para comprovativos e documentos, protecção contra path traversal em `resolve*Path`, limites de tamanho. Os acessos a documentos de encomenda exigem sessão do dono, staff ou e-mail da compra, via POST para não pôr o e-mail no URL.

### 5. Rate limiting, HTTPS, endpoints administrativos
Ver M1, A3. Os endpoints administrativos estão atrás de `requireStaff` e dos papéis, mas sem rate limit nem registo (A4). Recomenda-se também colocar o `/admin` (API) e `admin.html` atrás de um segundo factor (TOTP) para contas ADMIN, dado o que podem fazer (IBAN, utilizadores, eliminações).

### 6. Variáveis de ambiente e segredos
- ✅ `.env` está no `.gitignore` e não aparece em `git ls-files`. A validação com Zod falha o arranque se `JWT_SECRET` for curto. `ADMIN_*` não têm valores no código.
- ⚠️ Credenciais de exemplo previsíveis (A6). Não há gestão de rotação, e o `JWT_SECRET` não permite rotação sem invalidar todas as sessões.
- ⚠️ `ANTHROPIC_API_KEY`, `SMTP_PASS`, `WHATSAPP_ACCESS_TOKEN` ficam em `.env` em texto simples. Em produção usar o gestor de segredos do alojamento, com permissões 600 no ficheiro.

### 7. Registo de operações administrativas, backups, retenção
Ver A4 e M8.

### 8. Monitorização de erros e actividade suspeita
- ✅ Os erros 500 devolvem mensagem genérica e vão para `console.error`; o `morgan 'combined'` regista o acesso em produção.
- ❌ Não há `process.on('unhandledRejection'/'uncaughtException')`, nem agregação de erros (Sentry ou equivalente), nem alertas.
- ❌ Falhas de login, 401/403 repetidos, 429 e webhooks com assinatura inválida não são registados de forma estruturada nem alertados.
- ❌ O `/health` não cobre disco (`backend/storage`) nem a fila de notificações.

## Plano de correcção sugerido

1. **Já (horas):** corrigir C1 e C2 com um helper `esc()` partilhado. Aplicar `npm audit fix` (A5). Limpar as credenciais do `.env.example` (A6).
2. **Esta semana:** `AuditLog` (A4); limites de tamanho e validação de URLs (M5); rate limit em `POST /orders` (M1); `trust proxy` + TLS + redirect + CSP no proxy (A2, A3); `algorithms: ['HS256']` e dummy-compare no login (M2, M3).
3. **Antes do lançamento:** backups agendados e cifrados, com um teste de reposição (M8); política de retenção e eliminação de dados pessoais; Sentry e alertas de 401/429 (secção 8); TOTP para ADMIN; revisão de `whatsapp-conversations.js` e do assistente (injecção de prompt, que não foi coberta).
