// TradeX Backoffice - Detalhe completo da encomenda (modal só de leitura)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const aoa = (n) => `${Math.round(Number(n) || 0).toLocaleString('pt-AO')} Kz`;
const when = (d) => (d ? new Date(d).toLocaleString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const safeImg = (u) => (/^(https?:\/\/|\/|data:image\/)/i.test(u || '') ? u : '');

const DELIVERY = {
  pickup: 'Levantamento no Terminal TradeX',
  delivery_luanda: 'Entrega em Luanda',
  delivery_interprovincial: 'Entrega interprovincial'
};
const PAY_STATUS = {
  PENDING: 'Pendente', REVIEW_PENDING: 'Comprovativo por validar', CONFIRMED: 'Confirmado',
  PAID: 'Pago', REJECTED: 'Rejeitado', FAILED: 'Falhado'
};

let overlay = null;
let onChangeStatus = null;

function row(label, value) {
  return `<div class="od-row"><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function render(order, statusLabel) {
  const c = order.customer || {};
  const l = order.logistics || {};
  const f = order.financial || {};
  const p = order.payment;
  const a = l.address;
  const items = order.items || [];

  const addr = a
    ? [a.street || a.address, a.neighborhood, a.municipality, a.province, a.reference].filter(Boolean).map(esc).join(', ')
    : '';

  return `
    <div class="od-section">
      <h4>Cliente</h4>
      ${row('Nome', esc(c.name || '—') + (order.isGuest ? ' <small>(convidado)</small>' : ''))}
      ${row('E-mail', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—')}
      ${row('Telefone', c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—')}
      ${c.nif ? row('NIF', esc(c.nif)) : ''}
    </div>

    <div class="od-section">
      <h4>Logística</h4>
      ${row('Modalidade', esc(l.shippingMode || '—'))}
      ${row('Entrega', esc(DELIVERY[l.deliveryMethod] || l.deliveryMethod || '—'))}
      ${row('Origem → Destino', `${esc(l.origin || 'China')} → ${esc(l.destination || 'Angola')}`)}
      ${addr ? row('Morada', addr) : ''}
      ${l.estimatedDeliveryDays ? row('Prazo estimado', `${esc(l.estimatedDeliveryDays)} dias`) : ''}
      ${order.shipmentCode ? row('Lote', esc(order.shipmentCode) + (order.shipmentTitle ? ` · ${esc(order.shipmentTitle)}` : '')) : ''}
    </div>

    <div class="od-section od-wide">
      <h4>Produtos (${items.length})</h4>
      <ul class="od-items">
        ${items.map(i => `
          <li>
            ${safeImg(i.image) ? `<img src="${esc(safeImg(i.image))}" alt="" loading="lazy" />` : '<span class="od-noimg"></span>'}
            <div><strong>${esc(i.title)}</strong><small>${esc(i.quantity)} × ${aoa(i.priceAoa)}</small></div>
            <b>${aoa(i.subtotal)}</b>
          </li>`).join('') || '<li class="od-empty">Sem produtos.</li>'}
      </ul>
    </div>

    <div class="od-section">
      <h4>Valores</h4>
      ${row('Subtotal', aoa(f.subtotalAoa))}
      ${row('Frete internacional', aoa(f.internationalFreightAoa))}
      ${row('Seguro / alfândega', aoa(f.customsInsuranceAoa))}
      ${row('Entrega', aoa(f.deliveryCostAoa))}
      <div class="od-row od-total"><span>Total</span><strong>${aoa(f.totalAoa)}</strong></div>
    </div>

    <div class="od-section">
      <h4>Pagamento</h4>
      ${p ? `
        ${row('Método', esc(p.methodName || p.method || '—'))}
        ${row('Estado', esc(PAY_STATUS[p.status] || p.status || '—'))}
        ${p.transactionId ? row('Transação', `<code>${esc(p.transactionId)}</code>`) : ''}
        ${p.reference ? row('Referência', `<code>${esc(p.reference)}</code>`) : ''}
        ${p.phone ? row('Telefone', esc(p.phone)) : ''}
        ${row('Comprovativo', p.hasProof ? `${esc(p.proofFileName || 'Anexado')} <small>${esc(when(p.proofUploadedAt))}</small>` : 'Não enviado')}
        ${p.rejectionReason ? row('Motivo da rejeição', esc(p.rejectionReason)) : ''}
      ` : '<p class="od-empty">Sem pagamento registado.</p>'}
    </div>

    <div class="od-section od-wide">
      <h4>Histórico de estados</h4>
      <ol class="od-history">
        ${(order.history || []).map(h => `
          <li>
            <strong>${esc(h.label || h.status)}</strong>
            <small>${esc(when(h.date))}${h.responsible ? ` · ${esc(h.responsible)}` : ''}${h.location ? ` · ${esc(h.location)}` : ''}</small>
            ${h.note ? `<p>${esc(h.note)}</p>` : ''}
          </li>`).join('') || '<li class="od-empty">Sem eventos.</li>'}
      </ol>
    </div>`;
}

function close() { overlay?.classList.remove('visible'); }

function ensure() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'auth-modal-overlay';
  overlay.id = 'orderDetailOverlay';
  overlay.innerHTML = `
    <div class="auth-modal-card od-card" role="dialog" aria-modal="true" aria-labelledby="odTitle">
      <div class="auth-modal-header">
        <div class="auth-modal-title-wrap">
          <h3 class="auth-modal-title" id="odTitle"></h3>
          <p class="auth-modal-subtitle" id="odSub"></p>
        </div>
        <button type="button" class="auth-modal-close" id="odClose" aria-label="Fechar">&times;</button>
      </div>
      <div class="od-body" id="odBody"></div>
      <div class="od-footer">
        <button type="button" class="btn-dark" id="odChange">Alterar estado</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#odClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('visible')) close(); });
  overlay.querySelector('#odChange').addEventListener('click', () => {
    const order = overlay._order;
    close();
    if (order && onChangeStatus) onChangeStatus(order);
  });
  return overlay;
}

export function openOrderDetail(order, { statusLabel, changeStatus } = {}) {
  onChangeStatus = changeStatus || null;
  const el = ensure();
  el._order = order;
  el.querySelector('#odTitle').textContent = `Encomenda ${order.number}`;
  el.querySelector('#odSub').innerHTML = `${esc(when(order.createdAt))} · <span class="od-status">${esc(statusLabel || order.statusLabel || order.status)}</span>`;
  el.querySelector('#odBody').innerHTML = render(order, statusLabel);
  el.querySelector('#odChange').hidden = !onChangeStatus;
  el.querySelector('.od-body').scrollTop = 0;
  el.classList.add('visible');
}
