// TradeX Global Trading - Backoffice: conversas WhatsApp, notificações e integrações (Fase 5)
import { api } from './api.js';
import { authStore } from './auth.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (d) => new Date(d).toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtPhone = (p) => (p?.startsWith('244') ? `+244 ${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}` : `+${p}`);

const STATUS_LABEL = { BOT: 'Assistente', HUMAN: 'Equipa', CLOSED: 'Encerrada' };
const AUTHOR_LABEL = { CUSTOMER: 'Cliente', BOT: 'Assistente', STAFF: 'Equipa', SYSTEM: 'Aviso automático' };
const EVENT_LABEL = {
  order_created: 'Encomenda registada', proof_received: 'Comprovativo recebido', payment_approved: 'Pagamento confirmado',
  payment_declined: 'Comprovativo rejeitado', status_changed: 'Mudança de estado', manual: 'Mensagem manual', password_reset: 'Recuperação de senha'
};

const state = { filter: 'HUMAN', selectedId: null, list: [] };
let pollTimer = null;

// ---------------- Conversas ----------------
async function loadConversations() {
  if (!authStore.isStaff()) return;
  const res = await api.admin.conversations(state.filter === 'ALL' ? undefined : state.filter);
  if (!res.ok) return;
  state.list = res.data.data;
  renderList();
  updateNavBadge();
}

async function updateNavBadge() {
  // O distintivo conta conversas à espera da equipa, independentemente do filtro
  const res = state.filter === 'HUMAN' ? { ok: true, data: { data: state.list } } : await api.admin.conversations('HUMAN');
  const badge = document.getElementById('adminConversationsBadge');
  if (!badge || !res.ok) return;
  const waiting = res.data.data.filter(c => c.unread > 0).length;
  badge.textContent = waiting;
  badge.hidden = waiting === 0;
}

function renderList() {
  const box = document.getElementById('convList');
  if (!box) return;
  if (!state.list.length) {
    box.innerHTML = `<p class="admin-empty-note">${state.filter === 'HUMAN' ? 'Nenhuma conversa à espera da equipa.' : 'Sem conversas.'}</p>`;
    return;
  }
  box.innerHTML = state.list.map(c => `
    <button type="button" class="conv-item ${c.id === state.selectedId ? 'active' : ''}" data-conv="${c.id}">
      <span class="conv-item-top">
        <strong>${esc(c.profileName || fmtPhone(c.phone))}</strong>
        <span class="conv-item-time">${when(c.lastMessageAt)}</span>
      </span>
      <span class="conv-item-preview">${c.lastMessage ? `${esc(AUTHOR_LABEL[c.lastMessage.author] || '')}: ${esc(c.lastMessage.text)}` : ''}</span>
      <span class="conv-item-tags">
        <span class="conv-tag conv-tag-${c.status.toLowerCase()}">${STATUS_LABEL[c.status]}</span>
        ${c.unread ? `<span class="conv-tag conv-tag-unread">${c.unread} nova(s)</span>` : ''}
        ${c.orders.length ? `<span class="conv-tag">${esc(c.orders[0])}</span>` : ''}
      </span>
    </button>`).join('');
}

async function openConversation(id) {
  state.selectedId = id;
  renderList();
  const pane = document.getElementById('convThread');
  const res = await api.admin.conversation(id);
  if (!res.ok || !pane) {
    if (pane) pane.innerHTML = `<p class="admin-empty-note">${esc(res.message)}</p>`;
    return;
  }
  const c = res.data.data;
  pane.innerHTML = `
    <div class="conv-thread-head">
      <div>
        <strong>${esc(c.profileName || 'Cliente')}</strong>
        <span class="table-sub-detail">${fmtPhone(c.phone)} • ${STATUS_LABEL[c.status]}${c.handoffReason ? ` — ${esc(c.handoffReason)}` : ''}</span>
        ${c.orders.length ? `<span class="table-sub-detail">Encomendas: ${c.orders.map(o => `${esc(o.number)} (${esc(o.status)})`).join(', ')}</span>` : ''}
      </div>
      <div class="conv-thread-actions">
        ${c.status !== 'HUMAN' ? '<button type="button" class="btn-outline-dark btn-xs" data-conv-status="HUMAN">Assumir</button>' : ''}
        ${c.status !== 'BOT' ? '<button type="button" class="btn-outline-dark btn-xs" data-conv-status="BOT">Devolver ao assistente</button>' : ''}
        ${c.status !== 'CLOSED' ? '<button type="button" class="btn-outline-dark btn-xs" data-conv-status="CLOSED">Encerrar</button>' : ''}
      </div>
    </div>
    <div class="conv-messages" id="convMessages">
      ${c.messages.map(m => `
        <div class="conv-msg conv-msg-${m.direction === 'IN' ? 'in' : 'out'} conv-msg-${m.author.toLowerCase()}">
          <span class="conv-msg-meta">${AUTHOR_LABEL[m.author] || m.author} • ${when(m.createdAt)}${m.deliveryStatus && m.direction === 'OUT' ? ` • ${esc(m.deliveryStatus === 'SIMULATED' ? 'simulado' : m.deliveryStatus.toLowerCase())}` : ''}</span>
          <p>${esc(m.text).replace(/\n/g, '<br>')}</p>
        </div>`).join('')}
    </div>
    <form class="conv-reply" id="convReplyForm">
      ${c.canReply ? '' : '<p class="proof-upload-feedback info">Passaram mais de 24h desde a última mensagem do cliente: o WhatsApp só permite modelos aprovados. Use "Notificações" para enviar um aviso da encomenda.</p>'}
      <textarea id="convReplyText" class="checkout-input" rows="3" maxlength="4000" placeholder="Escreva a resposta ao cliente…" ${c.canReply ? '' : 'disabled'}></textarea>
      <div class="conv-reply-actions">
        <button type="submit" class="btn-dark" ${c.canReply ? '' : 'disabled'}>Enviar pelo WhatsApp</button>
        <span class="proof-upload-feedback" id="convReplyFeedback" role="status"></span>
      </div>
    </form>`;
  const msgs = document.getElementById('convMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
  updateNavBadge();
}

function bindConversations() {
  document.querySelectorAll('#convFilters .admin-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#convFilters .admin-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.convFilter;
      loadConversations();
    });
  });

  document.getElementById('convList')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-conv]');
    if (item) openConversation(item.dataset.conv);
  });

  const thread = document.getElementById('convThread');
  thread?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-conv-status]');
    if (!btn || !state.selectedId) return;
    btn.disabled = true;
    const res = await api.admin.setConversationStatus(state.selectedId, btn.dataset.convStatus);
    if (!res.ok) alert(res.message);
    await loadConversations();
    openConversation(state.selectedId);
  });

  thread?.addEventListener('submit', async (e) => {
    if (e.target.id !== 'convReplyForm') return;
    e.preventDefault();
    const text = document.getElementById('convReplyText').value.trim();
    const fb = document.getElementById('convReplyFeedback');
    if (!text) return;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    const res = await api.admin.replyConversation(state.selectedId, text);
    btn.disabled = false;
    if (!res.ok) {
      fb.textContent = res.message;
      fb.className = 'proof-upload-feedback error';
      return;
    }
    await openConversation(state.selectedId);
    loadConversations();
  });
}

// ---------------- Notificações e integrações ----------------
async function renderIntegrations() {
  const box = document.getElementById('adminIntegrations');
  if (!box) return;
  const res = await api.admin.integrations();
  if (!res.ok) return;
  const d = res.data.data;
  const row = (name, on, okText, offText) => `
    <div class="admin-channel-row">
      <div class="channel-info"><strong>${name}</strong><span>${on ? okText : offText}</span></div>
      <span class="client-status-pill ${on ? '' : 'pill-off'}">${on ? 'ACTIVO' : 'SIMULADO'}</span>
    </div>`;
  box.innerHTML = [
    row('WhatsApp Business (envio)', d.whatsapp, 'Mensagens enviadas pela Cloud API.', 'Sem credenciais: as mensagens ficam registadas mas não são enviadas.'),
    row('WhatsApp (receção / webhook)', d.whatsappWebhook, 'A receber mensagens dos clientes.', 'Defina WHATSAPP_VERIFY_TOKEN e WHATSAPP_APP_SECRET.'),
    row('Modelo de aviso aprovado', d.whatsappTemplate, 'Avisos fora da janela de 24h usam o modelo aprovado.', 'Sem modelo: avisos só chegam a quem escreveu nas últimas 24h.'),
    row('E-mail (SMTP)', d.email, 'E-mails enviados.', 'Sem SMTP: os e-mails ficam registados mas não são enviados.'),
    row('Assistente IA', d.assistant, `Responde automaticamente (${esc(d.assistantModel)}).`, 'Sem ANTHROPIC_API_KEY: as conversas vão directamente para a equipa.')
  ].join('');
}

async function renderNotificationLogs() {
  const list = document.getElementById('adminNotifLogList');
  if (!list) return;
  const res = await api.admin.notifications(40);
  if (!res.ok) return;
  const items = res.data.data;
  if (!items.length) {
    list.innerHTML = '<li class="admin-empty-note">Ainda não foram enviadas notificações.</li>';
    return;
  }
  list.innerHTML = items.map(n => `
    <li class="admin-notif-log-item">
      <div class="notif-log-head">
        <strong>${esc(EVENT_LABEL[n.event] || n.event)}${n.orderNumber ? ` • ${esc(n.orderNumber)}` : ''}</strong>
        <span class="notif-log-status notif-${n.status.toLowerCase()}">${n.channel === 'EMAIL' ? 'E-mail' : 'WhatsApp'} • ${n.status === 'SIMULATED' ? 'simulado' : n.status === 'SENT' ? 'enviado' : 'falhou'}</span>
      </div>
      <span class="table-sub-detail">${esc(n.recipient)} • ${when(n.createdAt)}</span>
      <p class="notif-log-preview">${esc(n.body.split('\n')[0])}</p>
      ${n.error ? `<span class="table-sub-detail notif-error">${esc(n.error)}</span>` : ''}
    </li>`).join('');
}

export function fillNotificationOrders() {
  const sel = document.getElementById('notifTargetOrder');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = authStore.getOrders().map(o => `<option value="${esc(o.number)}">${esc(o.number)} — ${esc(o.customer?.name || '')}</option>`).join('');
  if (current) sel.value = current;
}

function bindNotifications() {
  document.getElementById('btnSendTestNotification')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const fb = document.getElementById('notifFeedback');
    const orderNumber = document.getElementById('notifTargetOrder')?.value;
    const message = document.getElementById('notifMessage')?.value.trim();
    if (!orderNumber || !message) {
      fb.textContent = 'Escolha a encomenda e escreva a mensagem.';
      fb.className = 'proof-upload-feedback error';
      return;
    }
    btn.disabled = true;
    const res = await api.admin.sendNotification({ orderNumber, message });
    btn.disabled = false;
    fb.textContent = res.ok ? 'Mensagem enviada (veja o estado no histórico).' : res.message;
    fb.className = `proof-upload-feedback ${res.ok ? 'success' : 'error'}`;
    if (res.ok) {
      document.getElementById('notifMessage').value = '';
      renderNotificationLogs();
    }
  });
  window.addEventListener('tradex:orders-changed', fillNotificationOrders);
}

// ---------------- Ciclo de vida ----------------
let bound = false;
export function initConversations() {
  if (bound) return;
  bound = true;
  bindConversations();
  bindNotifications();
}

export function refreshConversations() {
  if (!authStore.isStaff()) return;
  loadConversations();
  renderIntegrations();
  renderNotificationLogs();
  fillNotificationOrders();
  // Actualiza as conversas a cada 20 s enquanto o backoffice está aberto e visível
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (document.hidden || !authStore.isStaff()) return;
    loadConversations();
    if (state.selectedId && document.getElementById('adminPanelConversations')?.classList.contains('active')) {
      const typing = document.getElementById('convReplyText')?.value;
      if (!typing) openConversation(state.selectedId);
    }
  }, 20000);
}

export const refreshNotificationLogs = renderNotificationLogs;
