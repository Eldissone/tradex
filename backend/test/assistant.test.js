// Testes do assistente WhatsApp com um cliente Claude simulado (sem chamadas reais à API).
// Correr: npm test --workspace=backend
import 'dotenv/config';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { runAssistant } from '../src/infrastructure/assistant/assistant.js';
import { normalizePhone, verifyWhatsAppSignature } from '../src/infrastructure/notifications/whatsapp.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/infrastructure/database/prisma.js';

after(() => prisma.$disconnect());

// Devolve as respostas indicadas, por ordem, e guarda os pedidos recebidos
function fakeClient(responses) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        create: async (params) => {
          calls.push(structuredClone(params));
          const next = responses.shift();
          if (!next) throw new Error('Sem mais respostas simuladas');
          return next;
        }
      }
    }
  };
}

const ctx = () => ({ phone: '244923456789', conversationId: 'test', profileName: 'Teste' });

test('usa a ferramenta de catálogo e responde com o resultado', async () => {
  const client = fakeClient([
    {
      stop_reason: 'tool_use',
      content: [
        { type: 'thinking', thinking: '', signature: 'sig' },
        { type: 'tool_use', id: 'tu_1', name: 'search_products', input: { query: 'solar', category: '' } }
      ]
    },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Temos painéis solares 550W.' }] }
  ]);

  const out = await runAssistant({ history: [], userText: 'Têm painéis solares?', ctx: ctx(), clientOverride: client });

  assert.equal(out.reply, 'Temos painéis solares 550W.');
  assert.equal(out.handoff, null);
  assert.equal(client.calls.length, 2);

  // Pedido: instruções em cache, ferramentas strict, fallback e esforço configurados
  const first = client.calls[0];
  assert.equal(first.model, env.ASSISTANT_MODEL);
  assert.equal(first.system[0].cache_control.type, 'ephemeral');
  assert.ok(first.tools.every(t => t.strict === true && t.input_schema.additionalProperties === false));
  assert.equal(first.output_config.effort, env.ASSISTANT_EFFORT);

  // Segundo pedido: conteúdo do assistente reenviado sem alterações + resultado da ferramenta
  const second = client.calls[1].messages;
  assert.deepEqual(second[1].content[0], { type: 'thinking', thinking: '', signature: 'sig' });
  const toolResult = second[2].content[0];
  assert.equal(toolResult.type, 'tool_result');
  assert.equal(toolResult.tool_use_id, 'tu_1');
  const products = JSON.parse(toolResult.content);
  assert.ok(Array.isArray(products) && products.length > 0, 'devolve produtos do catálogo');
  assert.ok(products.every(p => /solar/i.test(`${p.title} ${p.specs}`) || p.category));

  // Histórico só cresce: user, assistant(tool_use), user(tool_result), assistant(final)
  assert.equal(out.history.length, 4);
});

test('pedido de pessoa passa a conversa para a equipa', async () => {
  const client = fakeClient([
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_2', name: 'request_human', input: { reason: 'Quer reembolso' } }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Uma pessoa da equipa vai responder.' }] }
  ]);
  const out = await runAssistant({ history: [], userText: 'Quero o meu dinheiro de volta', ctx: ctx(), clientOverride: client });
  assert.equal(out.handoff, 'Quer reembolso');
  assert.match(out.reply, /pessoa/);
});

test('encomenda de outro número não é revelada', async () => {
  const client = fakeClient([
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_3', name: 'get_order_status', input: { order_number: 'TDX-AO-2026-0002', email: '' } }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Não encontrei.' }] }
  ]);
  await runAssistant({ history: [], userText: 'Estado da TDX-AO-2026-0002?', ctx: ctx(), clientOverride: client });
  const result = JSON.parse(client.calls[1].messages[2].content[0].content);
  assert.equal(result.found, false);
});

test('recusa: não entra no histórico e passa à equipa', async () => {
  const history = [{ role: 'user', content: 'olá' }, { role: 'assistant', content: [{ type: 'text', text: 'Olá!' }] }];
  const client = fakeClient([{ stop_reason: 'refusal', content: [], stop_details: { type: 'refusal', category: null } }]);
  const out = await runAssistant({ history, userText: 'algo', ctx: ctx(), clientOverride: client });
  assert.ok(out.handoff);
  assert.equal(out.history, history);
});

test('normalização de números angolanos', () => {
  assert.equal(normalizePhone('+244 923 456 789'), '244923456789');
  assert.equal(normalizePhone('923456789'), '244923456789');
  assert.equal(normalizePhone('00244923456789'), '244923456789');
  assert.equal(normalizePhone(''), null);
});

test('assinatura do webhook WhatsApp', { skip: !env.WHATSAPP_APP_SECRET && 'WHATSAPP_APP_SECRET não definido' }, () => {
  const body = Buffer.from('{"entry":[]}');
  const sig = 'sha256=' + crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex');
  assert.equal(verifyWhatsAppSignature(body, sig), true);
  assert.equal(verifyWhatsAppSignature(Buffer.from('{"entry":[1]}'), sig), false);
  assert.equal(verifyWhatsAppSignature(body, 'sha256=00'), false);
});
