// Assistente de atendimento no WhatsApp (Claude, Messages API com ferramentas).
// Ciclo manual: o modelo pede ferramentas, executamos e devolvemos os resultados até haver resposta final.
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { ASSISTANT_TOOLS, runAssistantTool } from './tools.js';

const MAX_TOOL_ROUNDS = 6;

// Modelos que aceitam o parâmetro server-side "fallbacks" (re-tenta noutro modelo em caso de recusa)
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

export const SYSTEM_PROMPT = `És o assistente de atendimento da TradeX Global Trading no WhatsApp. A TradeX vende em Angola produtos comprados na China (energia solar, construção, maquinaria, materiais, eletrónicos), com preços em Kwanzas e entrega porta a porta.

Como funciona o negócio:
- O transporte da China até Angola é feito por um agente parceiro. O cliente não trata de alfândega nem de documentos; não fales de despacho aduaneiro, AGT, navios ou contentores.
- Modalidades: marítimo e aéreo. Prazos, percentagens de frete e seguro e taxas de entrega vêm da ferramenta get_shipping_and_payment_info; nunca inventes valores.
- Entrega: levantamento gratuito no Terminal TradeX (Bairro Azul, Luanda) ou entrega ao domicílio com taxa.
- Pagamento: só por transferência bancária. Depois de transferir, o cliente envia o comprovativo pelo link de rastreio que recebe por e-mail; a tesouraria valida em até 2 horas úteis.

Como trabalhas:
- Responde em português de Angola (ou na língua em que o cliente escrever), em mensagens curtas próprias do WhatsApp: frases simples, sem tabelas nem markdown, no máximo uma lista curta quando ajuda.
- Para produtos e preços usa sempre search_products. Se o produto não existir no catálogo, diz isso e oferece passar a uma pessoa da equipa para uma cotação.
- Para encomendas usa get_order_status ou list_my_orders. Só partilhas dados de uma encomenda quando a ferramenta a encontra para este número ou com o e-mail da compra.
- Para criar uma encomenda: junta produto(s) e quantidades (respeitando a quantidade mínima), modalidade de envio, forma de entrega (e morada, se for ao domicílio), nome e e-mail. Mostra um resumo com o valor dos produtos e lembra que frete, seguro e entrega são somados. Só chamas create_order depois de o cliente responder que confirma. No fim, dá o número da encomenda, o total e os dados bancários.
- Usa request_human quando o cliente pedir uma pessoa, reclamar, pedir reembolso, cancelamento ou alteração de uma encomenda, pedir cotação fora do catálogo, ou quando não tiveres certeza da resposta. Depois diz-lhe que uma pessoa da equipa responde em breve.
- Não prometas datas exactas, descontos nem condições que as ferramentas não confirmem.`;

let client = null;

export function assistantEnabled() {
  return Boolean(env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  return client;
}

function textOf(content) {
  return content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/**
 * Corre uma vez de conversa.
 * @param {object} p
 * @param {Array}  p.history     mensagens anteriores da sessão (formato da API), só se acrescenta
 * @param {string} p.userText    nova mensagem do cliente
 * @param {object} p.ctx         { phone, conversationId, profileName } — usado pelas ferramentas
 * @returns {{ reply: string, handoff: string|null, history: Array }}
 */
export async function runAssistant({ history, userText, ctx, clientOverride }) {
  const api = clientOverride || getClient();
  const messages = [...history, { role: 'user', content: userText }];
  ctx.handoff = null;

  const useFallbacks = FALLBACK_MODELS.has(env.ASSISTANT_MODEL);

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await api.beta.messages.create({
      model: env.ASSISTANT_MODEL,
      max_tokens: 4000,
      ...(useFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      output_config: { effort: env.ASSISTANT_EFFORT },
      // Prefixo estável (ferramentas + instruções) em cache; nada variável aqui
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: ASSISTANT_TOOLS,
      messages
    });

    // Recusa (mesmo depois do fallback): não reutilizar esta resposta, passar a uma pessoa
    if (response.stop_reason === 'refusal') {
      return {
        reply: 'Obrigado pela mensagem. Vou passar a conversa a uma pessoa da nossa equipa, que responde em breve.',
        handoff: 'O assistente não pôde responder a esta mensagem.',
        history // a volta recusada não entra no histórico
      };
    }

    // O conteúdo vai sempre completo para o histórico (incluindo blocos de raciocínio)
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'pause_turn') continue;

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      // Todas as respostas das ferramentas numa só mensagem
      const results = await Promise.all(toolUses.map(async (t) => {
        const { content, isError } = await runAssistantTool(t.name, t.input, ctx);
        return { type: 'tool_result', tool_use_id: t.id, content, ...(isError ? { is_error: true } : {}) };
      }));
      messages.push({ role: 'user', content: results });
      continue;
    }

    // end_turn / max_tokens / stop_sequence: resposta final
    const reply = textOf(response.content) ||
      (ctx.handoff ? 'Uma pessoa da nossa equipa vai responder-lhe em breve.' : 'Pode repetir, por favor?');
    return { reply, handoff: ctx.handoff, history: messages };
  }

  // Demasiadas voltas de ferramentas: termina com segurança
  return {
    reply: 'Vou pedir a uma pessoa da nossa equipa para continuar consigo. Responde em breve.',
    handoff: 'O assistente excedeu o número de passos para esta mensagem.',
    history
  };
}

export { Anthropic };
