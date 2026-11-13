# Plano de responsividade (mobile e tablet)

## Ponto de partida (medido a 375 px e 768 px)

- Todas as páginas têm `<meta viewport>` e o CSS (~10 000 linhas em `frontend/css/styles.css`) tem 30 `@media`, com breakpoints inconsistentes: 560, 640, 768, 820, 860, 900, 960, 992, 1024.
- Overflow horizontal real:
  - `/` (home): 606 px de largura de scroll a 375 px, 802 px a 768 px.
  - `/catalogo`: 920 px a 375 px **e** a 768 px.
  - Causa principal: `.quote-box` com `width: 1000px` e `.quote-form` com `width: 600px` (largura fixa, `styles.css` ~1037-1053). Na home, também `.world-map-backdrop` e um cartão (`article`, 272 px) a 768 px.
- `/produto`, `/rastreio`, `/checkout`, `/cliente`, `/redefinir-password` não transbordam. Na barra de navegação a 375 px, `.nav-links` e `.nav-actions` ultrapassam o ecrã (395–540 px) e o menu mobile tem de ser confirmado.
- **Não medido:** `/admin` (exige login). É a página mais pesada (1097 linhas HTML, tabelas, modais, sidebar) e a de maior risco.
- Breakpoints propostos (uma única escala): **mobile ≤ 640**, **tablet 641–1024**, desktop > 1024.

## Fase 1 — Fundações e bugs de overflow (0,5 dia)

1. Definir os 3 breakpoints como convenção no topo do CSS; migrar os `@media` soltos (560/820/860/900/960/992) para 640/1024 sem mudar o desktop.
2. Regras base: `img, svg, video { max-width: 100% }`, `* { min-width: 0 }` em filhos de flex/grid problemáticos, `overflow-wrap: anywhere` em textos longos (IBAN, números de encomenda, URLs).
3. Corrigir `.quote-box` / `.quote-form`: `width: 100%; max-width: 1000px/600px`; `.world-map-backdrop` com `overflow: hidden` no pai.
4. Verificação: script de overflow (iframe a 375/768, já usado nesta análise) em todas as páginas, deve dar `scrollWidth == largura`.

## Fase 2 — Navegação e componentes partilhados (1 dia)

1. Barra de navegação: menu hambúrguer (≤ 1024) com `nav-links` num painel; `nav-actions` (conta, carrinho) sempre visíveis; fechar ao navegar/Esc; `aria-expanded`. Código em `frontend/js/nav.js`.
2. Carrinho lateral (`.cart-drawer`): largura `min(420px, 100vw)`, altura `100dvh`, botões de quantidade com alvo de toque ≥ 44 px.
3. Modais (login, simulador, documentos/PDF): ecrã inteiro em mobile, scroll interno, `max-height: 100dvh`, botão fechar fixo.
4. Rodapé, cabeçalhos de secção e botões: tamanhos de fonte com `clamp()`, `button`/`input` com altura ≥ 44 px e `font-size ≥ 16px` nos inputs (evita zoom automático do iOS).

## Fase 3 — Páginas da loja (1–1,5 dias)

| Página | Pontos a tratar |
|---|---|
| Home | hero (slides + imagem), grelha de categorias, timeline, simulador, formulário de cotação |
| Catálogo | filtros em gaveta/accordion em mobile, grelha 1–2 colunas (mobile) / 3 (tablet), barra de pesquisa e ordenação em coluna |
| Produto | galeria + info em coluna única, barra "adicionar ao carrinho" fixa em baixo, tabela de especificações com scroll/empilhada |
| Checkout | resumo do pedido colapsável acima do formulário, campos em coluna, IBAN com quebra |
| Rastreio | formulário e linha temporal vertical, documentos em lista |
| Cliente | abas com scroll horizontal, tabelas de encomendas em cartões, drawer de documentos em ecrã inteiro |

## Fase 4 — Backoffice `/admin` (1,5–2 dias, maior risco)

1. Medir primeiro com login de teste (overflow + screenshots a 375/768).
2. Sidebar: off-canvas com botão hambúrguer ≤ 1024; topo fixo com título da secção.
3. Tabelas (produtos, encomendas, pagamentos, CMS, utilizadores, auditoria): envolver em `.table-scroll { overflow-x: auto }` ou, nas principais (encomendas, produtos), layout em cartões em mobile via `data-label`.
4. Modais de edição (produto, slide, encomenda): ecrã inteiro em mobile, ações fixas no rodapé, grelhas `form-grid-two` a uma coluna.
5. Conversas WhatsApp / documentos: lista e detalhe em dois ecrãs (navegação "voltar") em mobile.
6. Uploads de imagem: `input capture`/câmara em mobile já funciona com `<input type=file>`; garantir pré-visualização pequena.

## Fase 5 — Qualidade e verificação (1 dia)

1. Teste manual/automatizado em 360, 375, 414, 768, 820 (iPad) e 1024, em orientação vertical e horizontal; Chrome DevTools e um dispositivo real iOS/Android.
2. Verificar com o script de overflow, Lighthouse mobile (Acessibilidade ≥ 90, alvos de toque), e `prefers-reduced-motion`.
3. Imagens: `srcset`/`loading="lazy"` nas grelhas do catálogo; hero com imagem menor em mobile.
4. Documentar a convenção em `docs/operacao.md` (breakpoints, utilitários `.table-scroll`).

## Ordem recomendada e esforço

Fase 1 → 2 → 3 → 4 → 5 — cerca de 5–6 dias. A fase 1 sozinha já corrige o scroll horizontal da home e do catálogo (valor imediato, baixo risco).

## Riscos

- `styles.css` tem ~10 000 linhas com regras duplicadas e sobrepostas; alterar breakpoints exige verificar cada secção. Mitigação: mudar um bloco de cada vez e rodar o script de overflow.
- O admin ainda não foi medido; a estimativa da fase 4 pode subir.
- O CSP atual (`'unsafe-inline'` para scripts) não impede nada disto, mas qualquer biblioteca nova de UI tem de respeitá-lo.

## Estado da execução

Fases 1–5 concluídas (ver `docs/operacao.md`, secção Responsividade). Pendente: barra fixa de compra na página de produto, resumo colapsável no checkout, tabelas do admin em cartões, validação em dispositivo real e com dados reais no admin, auditoria Lighthouse.
