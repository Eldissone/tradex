# Operação e backoffice

Guia para a equipa TradeX e para quem mantém o sistema. O backoffice está em `/admin`; só contas `ADMIN` e `STAFF` entram.

## Papéis

| Papel | Pode |
|---|---|
| `STAFF` | Encomendas, pagamentos, produtos, fornecedores, lotes, conversas, notificações, conteúdos (CMS) |
| `ADMIN` | Tudo o que o STAFF faz, mais: configurações (prazos, frete, taxas, dados bancários, métodos de pagamento) e gestão de contas (activar, desactivar, mudar papel) |

Para dar acesso a um colega: ele cria conta na loja e um `ADMIN` muda o papel em **Utilizadores & Conversão**.

## Rotina diária

### 1. Validar pagamentos (Financeiro)

1. Abra **Financeiro**. Os pagamentos com *Comprovativo por Validar* aparecem com os botões **Ver comprovativo**, **Aprovar** e **Rejeitar**.
2. Compare o comprovativo (PDF ou imagem) com o extracto bancário: valor, data e o número da encomenda no descritivo.
3. **Aprovar:** a encomenda passa a *Pagamento Confirmado* e o cliente é avisado.
4. **Rejeitar:** escreva o motivo (o cliente vê-o no rastreio e na área de cliente e pode reenviar).

O cartão no topo mostra o resumo do período: recebido, por validar, a aguardar transferência e rejeitado. O prazo prometido ao cliente é de até 2 horas úteis.

### 2. Fazer avançar as encomendas (Gestão de Encomendas)

Estados, por ordem:

| Estado | Quando |
|---|---|
| Aguardando Pagamento | Encomenda criada, sem pagamento validado |
| Pagamento Confirmado | Tesouraria validou |
| Em Processamento (compra na China) | Compra feita ao fornecedor |
| Enviado | Entregue ao agente parceiro (aéreo ou marítimo) |
| Chegou a Angola | O agente confirmou a chegada |
| Pronto para Levantamento | Disponível no Terminal TradeX, Bairro Azul |
| Em Entrega ao Domicílio | Com a equipa de entregas |
| Entregue | Concluída |
| Cancelada | |

Use **Alterar Estado**, escreva a nota que o cliente vai ver e deixe marcado "Avisar o cliente por WhatsApp e e-mail" se quer que seja avisado. Os filtros permitem ver só comprovativos por validar, enviadas, em Angola, por modalidade, entrega ou período.

### 3. Lotes de envio (Logística)

Para enviar várias encomendas juntas ao agente parceiro:

1. **+ Novo Lote**: nome, aéreo ou marítimo, referência do agente, datas e volume.
2. No cartão do lote, escolha encomendas e **Adicionar**. Só entram encomendas com pagamento confirmado.
3. Quando o agente recolher, mude o estado do lote para **Enviado**: todas as encomendas do lote passam a *Enviado* e os clientes são avisados. O mesmo para **Chegou a Angola**.

A partir daí (levantamento, entrega) o estado muda encomenda a encomenda.

### 4. Conversas WhatsApp

O assistente responde sozinho. Em **Conversas WhatsApp**, o filtro *À espera da equipa* mostra o que precisa de uma pessoa (pedido do cliente, reclamação, reembolso, produto fora do catálogo, erro do assistente). O distintivo no menu conta as que têm mensagens novas.

- **Assumir:** a equipa passa a responder; o assistente fica calado nessa conversa.
- **Responder:** só é possível nas 24 horas seguintes à última mensagem do cliente (regra do WhatsApp). Depois disso, use **Notificações** para enviar um aviso da encomenda.
- **Devolver ao assistente:** o assistente volta a responder às mensagens seguintes.
- **Encerrar:** arquiva. Uma nova mensagem do cliente reabre-a com o assistente.

A lista actualiza-se a cada 20 segundos. O assistente nunca altera nem cancela encomendas, nem devolve dinheiro: nesses casos passa a conversa à equipa.

### 5. Notificações

Os avisos automáticos saem quando a encomenda é registada, o comprovativo é recebido, o pagamento é validado ou rejeitado e o estado muda. Em **Notificações** vê:

- o estado dos canais (WhatsApp, webhook, modelo de aviso, e-mail, assistente): *Activo* ou *Simulado*;
- o histórico (enviado, falhou, simulado, com o erro);
- um formulário para enviar uma mensagem manual ao cliente de uma encomenda.

*Simulado* significa que falta configurar as credenciais: a mensagem fica registada mas não sai. Ver [configuracao.md](configuracao.md).

## Catálogo, fornecedores e conteúdos

- **Catálogo:** criar/editar produtos (as fotos são enviadas para o servidor), associar o fornecedor e **Desactivar** produtos. Um produto desactivado sai da loja mas continua nas encomendas antigas.
- **Fornecedores:** contactos na China (e-mail, WeChat, WhatsApp, termos). Podem ser editados e desactivados.
- **CMS:** destaques da página inicial, banners, FAQ e páginas. O que a equipa publica é visto por todos os visitantes.

## Configurações (só ADMIN)

Em **Configurações**:

- **Envio e entrega:** prazo mínimo e máximo, % de frete por modalidade, taxas de entrega em Luanda e interprovincial, % de seguro de carga. O checkout passa a usar os novos valores de imediato; encomendas já criadas mantêm os seus.
- **Dados bancários:** titular e contas mostrados ao cliente no checkout e nas mensagens.

## Utilizadores & Conversão

- Lista com pesquisa e filtros (com compras, sem compras, equipa), total gasto, último acesso e quem veio de uma compra como convidado.
- Indicadores na **Visão Geral**: clientes registados e novos, quantos compraram, encomendas de convidados vs. contas, convidados que criaram conta e carrinhos abandonados (com produtos, sem mexer há 24 h e sem compra depois).
- **Desactivar** uma conta impede novos inícios de sessão e termina as sessões abertas.

## Cópias de segurança

Há dois sítios com dados que precisam de cópia regular:

1. **Base de dados PostgreSQL** (encomendas, contas, configurações, conversas):

   ```powershell
   pg_dump -U tradex -h localhost -Fc tradex -f tradex-AAAA-MM-DD.dump
   ```

   Repor numa base vazia: `pg_restore -U tradex -h localhost -d tradex --clean tradex-AAAA-MM-DD.dump`.

2. **`backend/storage/`** (comprovativos de pagamento em `payment-proofs/` e imagens em `public-uploads/`). Não está no Git. Uma cópia da base de dados sem esta pasta perde os ficheiros ligados às encomendas.

Guarde as cópias fora do servidor e teste uma reposição de vez em quando.

## Atualizar o sistema

```powershell
git pull
npm install
npm run db:deploy      # aplica migrações novas
npm run db:generate
npm run build          # só no frontend de produção
```

Depois reinicie a API. Nunca use `prisma migrate dev` nem `migrate reset` em produção: só `db:deploy`.

## Antes de produção

- [ ] `NODE_ENV=production` na API.
- [ ] `JWT_SECRET` novo e secreto (32+ caracteres aleatórios).
- [ ] `ADMIN_PASSWORD` forte e **diferente do exemplo**. O `.env.example` traz uma palavra-passe de exemplo; não a use. Depois do primeiro arranque, mude-a pelo perfil.
- [ ] Sem conta de demonstração: o seed não a cria em produção; se já foi criada, desactive-a.
- [ ] Não corra `npm run db:seed` em produção sem rever: além da conta demo (que não cria em produção), repõe produtos, fornecedores e lotes **de exemplo** (com e-mails `.example`) e sobrescreve os produtos com o mesmo id.
- [ ] HTTPS à frente da API e da loja (proxy inverso). `CORS_ORIGIN` e `PUBLIC_SITE_URL` com o domínio real; `VITE_API_URL` apontado à API antes do `npm run build`.
- [ ] A API a correr como serviço que reinicia sozinho (ex.: PM2 ou serviço do Windows), com os logs guardados.
- [ ] PostgreSQL com utilizador próprio e palavra-passe forte; porta 5432 fechada ao exterior.
- [ ] Cópias de segurança da base de dados e de `backend/storage` agendadas, com uma reposição testada.
- [ ] Credenciais reais: SMTP, WhatsApp (token, número, segredo da aplicação, modelo aprovado) e `ANTHROPIC_API_KEY`. Webhook registado na Meta (ver [configuracao.md](configuracao.md)).
- [ ] Dados bancários reais em Configurações (os do seed são de exemplo).
- [ ] Apagar encomendas, utilizadores e conversas de teste.
- [ ] O limite de tentativas é por processo: com mais de uma instância da API, passa a ser por instância.

## URLs sem `.html`

As páginas usam URLs limpos (`/catalogo`, `/rastreio?codigo=…`, `/admin`). O Vite (`npm run dev` e `vite preview`) trata disto sozinho e redirecciona `/pagina.html` para `/pagina`. Em produção, o servidor web que serve o `frontend/dist` tem de fazer o mesmo. Exemplo em Nginx:

```nginx
location / {
    try_files $uri $uri.html $uri/ =404;
}
```

Sem esta regra, abrir `/catalogo` directamente dá 404 (a navegação dentro do site também deixa de funcionar).

## Segurança em produção (proxy, HTTPS, CSP, auditoria)

- **HTTPS e proxy:** com `NODE_ENV=production` a API redirecciona HTTP→HTTPS e envia HSTS. Defina `TRUST_PROXY=1` (nº de proxies à frente) para o IP real chegar ao rate limit, e faça o proxy enviar `X-Forwarded-Proto`.
- **CSP da loja:** `frontend/vite.config.js` define os cabeçalhos (`SECURITY_HEADERS`) apenas no `vite preview`. Quem serve o `dist/` (Nginx/Caddy) deve enviar os mesmos: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Ajuste `connect-src` ao domínio da API.
- **Auditoria:** a tabela `AuditLog` regista escritas de staff/admin (com corpo, sem campos `pass/token/secret`), logins falhados e respostas 401/403/429. Consulta: `SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 100;`. Retenção: 12 meses (limpeza diária no arranque da API); tokens de recuperação expirados há mais de 7 dias também são apagados.
