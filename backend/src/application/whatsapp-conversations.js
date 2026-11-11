// Conversas WhatsApp: guarda mensagens, decide entre assistente e equipa, envia respostas.
import { prisma } from '../infrastructure/database/prisma.js';
import { sendWhatsAppText, normalizePhone } from '../infrastructure/notifications/whatsapp.js';
import { assistantEnabled, runAssistant } from '../infrastructure/assistant/assistant.js';

const SESSION_IDLE_MS = 24 * 60 * 60 * 1000; // nova sessão (histórico limpo) após 24h sem mensagens
const MAX_HISTORY_MESSAGES = 120;             // sessões muito longas recomeçam

const HANDOFF_AUTO_REPLY = 'Olá! Obrigado por contactar a TradeX. Uma pessoa da nossa equipa vai responder-lhe em breve.';

async function storeOutbound(conversationId, author, text) {
  const result = await sendWhatsAppText(
    (await prisma.conversation.findUnique({ where: { id: conversationId }, select: { phone: true } })).phone,
    text
  );
  await prisma.conversationMessage.create({
    data: {
      conversationId, direction: 'OUT', author, text,
      waMessageId: result.providerMessageId || null,
      deliveryStatus: result.status
    }
  });
  return result;
}

// Processa uma mensagem de texto recebida. Idempotente pelo id da mensagem do WhatsApp.
export async function handleInboundMessage({ phone: rawPhone, profileName, waMessageId, text, assistantClient }) {
  const phone = normalizePhone(rawPhone);
  if (!phone || !text?.trim()) return { skipped: 'empty' };

  if (waMessageId) {
    const dup = await prisma.conversationMessage.findUnique({ where: { waMessageId } });
    if (dup) return { skipped: 'duplicate' };
  }

  const now = new Date();
  let convo = await prisma.conversation.findUnique({ where: { phone } });
  const expired = convo && (now - convo.lastMessageAt > SESSION_IDLE_MS || (convo.history?.length || 0) > MAX_HISTORY_MESSAGES);

  if (!convo) {
    convo = await prisma.conversation.create({ data: { phone, profileName: profileName || null, lastMessageAt: now } });
  } else {
    convo = await prisma.conversation.update({
      where: { id: convo.id },
      data: {
        profileName: profileName || convo.profileName,
        lastMessageAt: now,
        // Sessão nova: histórico limpo; uma conversa fechada volta ao assistente
        ...(expired ? { history: [], sessionStartedAt: now } : {}),
        ...(convo.status === 'CLOSED' || (expired && convo.status === 'HUMAN') ? { status: 'BOT', handoffReason: null } : {})
      }
    });
  }

  try {
    await prisma.conversationMessage.create({
      data: { conversationId: convo.id, direction: 'IN', author: 'CUSTOMER', text: text.slice(0, 4000), waMessageId: waMessageId || null }
    });
  } catch (err) {
    if (err.code === 'P2002') return { skipped: 'duplicate' }; // entrega repetida em paralelo
    throw err;
  }

  // Conversa entregue à equipa: só avisa o backoffice
  if (convo.status === 'HUMAN') {
    await prisma.conversation.update({ where: { id: convo.id }, data: { unreadForStaff: { increment: 1 } } });
    return { routed: 'staff' };
  }

  // Sem assistente configurado: passa à equipa com uma resposta automática
  if (!assistantEnabled() && !assistantClient) {
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { status: 'HUMAN', handoffReason: 'Assistente automático desligado', unreadForStaff: { increment: 1 } }
    });
    await storeOutbound(convo.id, 'SYSTEM', HANDOFF_AUTO_REPLY);
    return { routed: 'staff', reason: 'assistant_disabled' };
  }

  // Contexto da sessão (data, nome) vai na mensagem do cliente, não nas instruções em cache
  const isFirstOfSession = !convo.history?.length;
  const userText = isFirstOfSession
    ? `[Contexto: hoje é ${now.toISOString().slice(0, 10)}. Nome no WhatsApp: ${profileName || 'desconhecido'}.]\n${text}`
    : text;

  let outcome;
  try {
    outcome = await runAssistant({
      history: convo.history || [],
      userText,
      ctx: { phone, conversationId: convo.id, profileName },
      clientOverride: assistantClient
    });
  } catch (err) {
    console.error('[WhatsApp] Erro do assistente:', err.message);
    outcome = { reply: HANDOFF_AUTO_REPLY, handoff: 'Erro técnico do assistente', history: convo.history || [] };
  }

  await prisma.conversation.update({
    where: { id: convo.id },
    data: {
      history: outcome.history,
      ...(outcome.handoff ? { status: 'HUMAN', handoffReason: outcome.handoff, unreadForStaff: { increment: 1 } } : {})
    }
  });
  await storeOutbound(convo.id, 'BOT', outcome.reply);
  return { routed: outcome.handoff ? 'staff' : 'bot', reply: outcome.reply };
}

// Resposta escrita pela equipa no backoffice
export async function sendStaffReply(conversationId, text, staffName) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return { ok: false, status: 404, message: 'Conversa não encontrada.' };
  if (Date.now() - convo.lastMessageAt.getTime() > SESSION_IDLE_MS) {
    return { ok: false, status: 409, message: 'Passaram mais de 24h desde a última mensagem do cliente. O WhatsApp só permite responder com um modelo aprovado.' };
  }
  const result = await storeOutbound(convo.id, 'STAFF', text);
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { status: 'HUMAN', unreadForStaff: 0, ...(convo.status !== 'HUMAN' ? { handoffReason: `Assumida por ${staffName}` } : {}) }
  });
  return { ok: result.status !== 'FAILED', status: result.status === 'FAILED' ? 502 : 200, message: result.error, delivery: result.status };
}
