// TradeX Global Trading - Checkout & Gestão de Encomendas
import { cartStore } from './cart.js';
import { authStore, openAuthModal } from './auth.js';
import { api } from './api.js';
import { renderProofUploader } from './proof-upload.js';
import { getShippingMode, formatTransitDays, getDeliveryFee, CARGO_INSURANCE_RATE, SHIPPING_MODES, DELIVERY_METHODS, loadShippingConfig } from './shipping-config.js';

let checkoutState = {
  deliveryMethod: 'pickup', // pickup | delivery_luanda | delivery_interprovincial
  shippingMode: 'sea_lcl',  // sea_lcl | air_exp
  paymentMethod: 'bank_transfer', // bank_transfer (mcx_* quando o gateway estiver activo)
  guestAddress: null,
  selectedAddressId: null,
  deliveryCostAoa: 0,
  internationalFreightAoa: 0,
  customsInsuranceAoa: 0
};

// Cálculo de encargos e frete
function calculateBreakdown(items) {
  const subtotal = items.reduce((acc, i) => acc + (i.priceAoa * i.quantity), 0);
  
  // Frete Internacional baseado na modalidade
  const freightRate = getShippingMode(checkoutState.shippingMode).freightRate;
  const internationalFreight = Math.round(subtotal * freightRate);

  // Seguro de carga
  const customsInsurance = Math.round((subtotal + internationalFreight) * CARGO_INSURANCE_RATE);

  // Entrega local
  const deliveryCost = getDeliveryFee(checkoutState.deliveryMethod);

  const grandTotal = subtotal + internationalFreight + customsInsurance + deliveryCost;

  checkoutState.deliveryCostAoa = deliveryCost;
  checkoutState.internationalFreightAoa = internationalFreight;
  checkoutState.customsInsuranceAoa = customsInsurance;

  return {
    subtotal,
    internationalFreight,
    customsInsurance,
    deliveryCost,
    grandTotal
  };
}

// Preenche prazos e taxas a partir da configuração única
function renderShippingConfigLabels() {
  Object.keys(SHIPPING_MODES).forEach(mode => {
    document.querySelectorAll(`[data-transit="${mode}"]`).forEach(el => { el.textContent = formatTransitDays(mode); });
  });
  Object.keys(DELIVERY_METHODS).forEach(method => {
    const fee = getDeliveryFee(method);
    document.querySelectorAll(`[data-delivery-fee="${method}"]`).forEach(el => {
      el.textContent = fee === 0 ? 'Gratuito' : cartStore.formatAoa(fee);
    });
  });
}

// Renderização dos Itens do Pedido na Coluna Direita
function renderCheckoutOrderSummary() {
  const items = cartStore.getItems();
  const listEl = document.getElementById('checkoutItemsList');
  const emptyState = document.getElementById('checkoutEmptyState');
  const mainContent = document.getElementById('checkoutMainLayout');

  if (items.length === 0) {
    if (emptyState) emptyState.classList.add('visible');
    if (mainContent) mainContent.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.remove('visible');
  if (mainContent) mainContent.classList.remove('hidden');

  const breakdown = calculateBreakdown(items);

  if (listEl) {
    const fallbackThumb = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';
    listEl.innerHTML = items.map(item => {
      const itemImg = (typeof item.image === 'string' && item.image.trim())
        ? item.image
        : (Array.isArray(item.images) && item.images.length > 0)
          ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url)
          : fallbackThumb;
      const validSrc = itemImg || fallbackThumb;

      return `
      <div class="checkout-item-row">
        <div class="checkout-item-thumb">
          <img src="${validSrc}" alt="${item.title}" onerror="this.onerror=null;this.src='${fallbackThumb}';" />
          <span class="checkout-item-qty-badge">${item.quantity}</span>
        </div>
        <div class="checkout-item-info">
          <h4 class="checkout-item-title">${item.title}</h4>
          <span class="checkout-item-category">${item.category ? item.category.toUpperCase() : 'TRADE-X'}</span>
          <span class="checkout-item-unit-price">${cartStore.formatAoa(item.priceAoa)} un.</span>
        </div>
        <div class="checkout-item-subtotal">
          ${cartStore.formatAoa(item.priceAoa * item.quantity)}
        </div>
      </div>
    `;
    }).join('');
  }

  // Atualização dos totais
  const elSubtotal = document.getElementById('summarySubtotal');
  const elFreight = document.getElementById('summaryFreight');
  const elCustoms = document.getElementById('summaryCustoms');
  const elDelivery = document.getElementById('summaryDelivery');
  const elGrandTotal = document.getElementById('summaryGrandTotal');

  if (elSubtotal) elSubtotal.textContent = cartStore.formatAoa(breakdown.subtotal);
  if (elFreight) elFreight.textContent = cartStore.formatAoa(breakdown.internationalFreight);
  if (elCustoms) elCustoms.textContent = cartStore.formatAoa(breakdown.customsInsurance);
  if (elDelivery) {
    elDelivery.textContent = breakdown.deliveryCost === 0 ? 'Gratuito (Terminal)' : cartStore.formatAoa(breakdown.deliveryCost);
  }
  if (elGrandTotal) elGrandTotal.textContent = cartStore.formatAoa(breakdown.grandTotal);
}

// Configuração da Identificação do Cliente
function setupCustomerSection() {
  const user = authStore.getUser();
  const loggedNotice = document.getElementById('customerLoggedNotice');
  const guestFields = document.getElementById('customerGuestFields');
  const loggedName = document.getElementById('loggedUserName');
  const loggedEmail = document.getElementById('loggedUserEmail');

  const inpName = document.getElementById('custFullName');
  const inpEmail = document.getElementById('custEmail');
  const inpPhone = document.getElementById('custPhone');
  const inpNif = document.getElementById('custNif');

  if (user) {
    if (loggedNotice) loggedNotice.classList.add('visible');
    if (guestFields) guestFields.classList.remove('visible');
    if (loggedName) loggedName.textContent = `${user.firstName} ${user.lastName}`;
    if (loggedEmail) loggedEmail.textContent = user.email;

    if (inpName) inpName.value = `${user.firstName} ${user.lastName}`;
    if (inpEmail) inpEmail.value = user.email;
    if (inpPhone) inpPhone.value = user.phone || '';
    if (inpNif) inpNif.value = user.nif || '';
  } else {
    if (loggedNotice) loggedNotice.classList.remove('visible');
    if (guestFields) guestFields.classList.add('visible');
  }

  document.getElementById('btnSwitchGuest')?.addEventListener('click', () => {
    if (loggedNotice) loggedNotice.classList.remove('visible');
    if (guestFields) guestFields.classList.add('visible');
  });
}

// Configuração de Endereços em Angola
// Cliente com sessão: moradas guardadas na conta. Convidado: morada só para esta encomenda.
function renderAddressCards(addresses) {
  const container = document.getElementById('savedAddressesList');
  if (!container) return;

  if (addresses.length === 0) {
    container.innerHTML = '<p class="address-empty-hint">Ainda não indicou uma morada. Adicione uma morada para entregas ao domicílio.</p>';
    checkoutState.selectedAddressId = null;
    return;
  }

  const selected = addresses.find(a => a.id === checkoutState.selectedAddressId) || addresses.find(a => a.isDefault) || addresses[0];
  checkoutState.selectedAddressId = selected.id;

  container.innerHTML = addresses.map(addr => `
    <label class="address-card-label ${addr.id === selected.id ? 'active' : ''}">
      <input type="radio" name="selectedAddress" value="${addr.id}" ${addr.id === selected.id ? 'checked' : ''} />
      <div class="address-card-content">
        <div class="address-card-header">
          <strong class="address-label-name">${escapeHtml(addr.label || 'Endereço de Entrega')}</strong>
          ${addr.isDefault ? '<span class="address-default-badge">Principal</span>' : ''}
        </div>
        <p class="address-recipient">${escapeHtml(addr.recipientName)} • ${escapeHtml(addr.phone)}</p>
        <p class="address-street">${escapeHtml(addr.street)}, ${escapeHtml(addr.municipality)}, ${escapeHtml(addr.province)}</p>
        ${addr.reference ? `<p class="address-ref">Ref: ${escapeHtml(addr.reference)}</p>` : ''}
      </div>
    </label>
  `).join('');

  container.querySelectorAll('input[name="selectedAddress"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      checkoutState.selectedAddressId = e.target.value;
      container.querySelectorAll('.address-card-label').forEach(l => l.classList.remove('active'));
      e.target.closest('.address-card-label')?.classList.add('active');
    });
  });
}

function currentAddresses() {
  if (authStore.isLoggedIn()) return authStore.getAddresses();
  return checkoutState.guestAddress ? [checkoutState.guestAddress] : [];
}

function setupAddressSection() {
  renderAddressCards(currentAddresses());
}

let addressHandlersBound = false;
function bindAddressHandlers() {
  if (addressHandlersBound) return;
  addressHandlersBound = true;

  const newAddrForm = document.getElementById('newAddressForm');
  document.getElementById('btnToggleNewAddress')?.addEventListener('click', () => {
    newAddrForm?.classList.toggle('visible');
  });

  document.getElementById('btnSaveNewAddress')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const address = {
      label: document.getElementById('newAddrLabel')?.value || 'Morada de Entrega',
      recipientName: document.getElementById('newAddrRecipient')?.value?.trim(),
      phone: document.getElementById('newAddrPhone')?.value?.trim(),
      province: document.getElementById('newAddrProvince')?.value,
      municipality: document.getElementById('newAddrMunicipality')?.value?.trim(),
      street: document.getElementById('newAddrStreet')?.value?.trim(),
      reference: document.getElementById('newAddrRef')?.value?.trim(),
      isDefault: false
    };

    if (!address.recipientName || !address.phone || !address.street || !address.municipality) {
      alert('Por favor, preencha todos os campos obrigatórios do endereço.');
      return;
    }

    if (authStore.isLoggedIn()) {
      const result = await authStore.saveAddress(address);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      checkoutState.selectedAddressId = result.address.id;
    } else {
      checkoutState.guestAddress = { ...address, id: 'guest' };
      checkoutState.selectedAddressId = 'guest';
    }

    setupAddressSection();
    newAddrForm?.classList.remove('visible');
  });

  // Métodos de Entrega (Opções)
  document.querySelectorAll('input[name="deliveryMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      checkoutState.deliveryMethod = e.target.value;
      renderCheckoutOrderSummary();
    });
  });
}

// Configuração de Modalidades de Frete e Pagamento
function setupOptionsSection() {
  document.querySelectorAll('input[name="shippingMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      checkoutState.shippingMode = e.target.value;
      renderCheckoutOrderSummary();
    });
  });

  const subfields = {
    mcx_express: document.getElementById('paymentMcxExpressFields'),
    mcx_reference: document.getElementById('paymentMcxRefFields'),
    bank_transfer: document.getElementById('paymentBankTransferFields')
  };

  const applyMethod = (method) => {
    checkoutState.paymentMethod = method;
    Object.entries(subfields).forEach(([key, el]) => el?.classList.toggle('visible', key === method));
  };

  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => applyMethod(e.target.value));
  });

  // Métodos activos e dados bancários definidos no backoffice
  api.config.payments().then(res => {
    if (!res.ok) return;
    const { enabledMethods = ['bank_transfer'], bank } = res.data.data;
    paymentConfig.bank = bank;

    document.querySelectorAll('[data-pm]').forEach(label => {
      label.hidden = !enabledMethods.includes(label.getAttribute('data-pm'));
    });
    if (!enabledMethods.includes(checkoutState.paymentMethod)) {
      const first = enabledMethods[0];
      const input = document.querySelector(`input[name="paymentMethod"][value="${first}"]`);
      if (input) input.checked = true;
      applyMethod(first);
    }
  });
}

const paymentConfig = { bank: null };

// Submissão e Confirmação da Compra (Criação da Encomenda na API)
function setupCheckoutSubmission() {
  const form = document.getElementById('checkoutMainForm');
  const submitBtn = document.getElementById('btnConfirmOrder');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = cartStore.getItems();
    if (items.length === 0) {
      alert('O seu pedido está vazio.');
      return;
    }

    let customerName = document.getElementById('custFullName')?.value?.trim();
    let customerEmail = document.getElementById('custEmail')?.value?.trim();
    let customerPhone = document.getElementById('custPhone')?.value?.trim();
    const customerNif = document.getElementById('custNif')?.value?.trim();

    const user = authStore.getUser();
    if (user && !customerName) {
      customerName = `${user.firstName} ${user.lastName}`.trim();
      customerEmail = user.email;
      customerPhone = user.phone;
    }

    if (!customerName || !customerEmail || !customerPhone) {
      alert('Por favor, preencha o seu nome, e-mail e telefone de contacto.');
      return;
    }

    const needsAddress = checkoutState.deliveryMethod !== 'pickup';
    const addresses = currentAddresses();
    const selectedAddress = addresses.find(a => a.id === checkoutState.selectedAddressId) || null;
    if (needsAddress && !selectedAddress) {
      alert('Indique a morada de entrega ou escolha o levantamento no Terminal TradeX.');
      return;
    }

    const payload = {
      items: items.map(i => ({ id: i.id, quantity: i.quantity })),
      customer: { name: customerName, email: customerEmail, phone: customerPhone, nif: customerNif || null },
      shippingMode: checkoutState.shippingMode,
      deliveryMethod: checkoutState.deliveryMethod,
      paymentMethod: checkoutState.paymentMethod
    };
    if (selectedAddress) {
      if (authStore.isLoggedIn() && selectedAddress.id !== 'guest') payload.addressId = selectedAddress.id;
      else {
        const { id, isDefault, ...addr } = selectedAddress;
        payload.address = addr;
      }
    }

    if (submitBtn) submitBtn.disabled = true;
    const res = await api.orders.create(payload);
    if (submitBtn) submitBtn.disabled = false;

    if (!res.ok) {
      alert(res.message || 'Não foi possível registar a encomenda.');
      return;
    }

    const order = authStore.cacheOrder(res.data.data);
    cartStore.clear();
    if (authStore.isLoggedIn()) authStore.refreshPayments();
    showOrderSuccessScreen(order);
  });
}

function bankAccountsHtml() {
  const accounts = paymentConfig.bank?.accounts || [];
  if (accounts.length === 0) {
    return '<p class="inst-sub">Os dados bancários serão enviados pela equipa TradeX.</p>';
  }
  return `<ul class="inst-bank-list">${accounts.map(a => `<li><strong>${escapeHtml(a.bank)}:</strong> ${escapeHtml(a.iban)}</li>`).join('')}</ul>`;
}

// Exibição da Tela de Confirmação & Recibo
function showOrderSuccessScreen(order) {
  const mainLayout = document.getElementById('checkoutMainLayout');
  const successScreen = document.getElementById('checkoutSuccessScreen');
  if (!successScreen) return;

  if (mainLayout) mainLayout.classList.add('hidden');
  successScreen.classList.add('visible');

  const elNum = document.getElementById('successOrderNumber');
  const elDate = document.getElementById('successOrderDate');
  const elTotal = document.getElementById('successOrderTotal');
  const elCustomer = document.getElementById('successCustomerName');
  const elMethod = document.getElementById('successPaymentMethod');
  const elDetailsBox = document.getElementById('successPaymentDetails');
  const elTrackLink = document.getElementById('btnTrackSuccessOrder');

  const payment = order.payment || {};

  if (elNum) elNum.textContent = order.number;
  if (elDate) elDate.textContent = new Date(order.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (elTotal) elTotal.textContent = cartStore.formatAoa(order.financial.totalAoa);
  if (elCustomer) elCustomer.textContent = `${order.customer.name} (${order.customer.email})`;
  if (elMethod) elMethod.textContent = payment.methodName || 'Transferência Bancária';
  if (elTrackLink) elTrackLink.href = `rastreio?codigo=${encodeURIComponent(order.number)}`;

  if (elDetailsBox) {
    if (payment.status === 'APPROVED') {
      elDetailsBox.innerHTML = `
        <div class="payment-confirmed-box">
          <div class="confirmed-badge-row">
            <span class="confirmed-pill">PAGAMENTO CONFIRMADO</span>
          </div>
          <h3 class="confirmed-title">Pagamento validado pela tesouraria</h3>
          <p class="confirmed-text">O valor de <strong>${cartStore.formatAoa(order.financial.totalAoa)}</strong> foi confirmado. A encomenda segue para compra junto do fornecedor na China.</p>
        </div>
      `;
    } else if (payment.status === 'REVIEW_PENDING') {
      elDetailsBox.innerHTML = `
        <div class="payment-review-box">
          <div class="review-badge-row">
            <span class="review-pill">COMPROVATIVO EM VALIDAÇÃO</span>
          </div>
          <h3 class="review-title">Comprovativo de Transferência Submetido</h3>
          <p class="review-text">A tesouraria da TradeX está a conferir a sua transferência. Prazo habitual de validação: até 2 horas úteis. Acompanhe o estado no portal de rastreio.</p>
        </div>
      `;
    } else {
      const declined = payment.status === 'DECLINED';
      elDetailsBox.innerHTML = `
        <div class="payment-instruction-box">
          <div class="inst-pill">${declined ? 'COMPROVATIVO REJEITADO — ENVIE NOVAMENTE' : 'TRANSFERÊNCIA BANCÁRIA'}</div>
          <p>Transfira <strong>${cartStore.formatAoa(order.financial.totalAoa)}</strong> para as contas da ${escapeHtml(paymentConfig.bank?.accountHolder || 'TradeX Global Trading Lda')}:</p>
          ${bankAccountsHtml()}
          <p class="inst-sub">Indique o número da encomenda no descritivo da transferência: <strong>${order.number}</strong>.</p>

          <p class="inst-sub">Ainda não transferiu? Pode enviar o comprovativo mais tarde na página de rastreio${authStore.isLoggedIn() ? ' ou na sua área de cliente' : ''}.</p>
          <div class="gateway-simulation-card" id="checkoutProofUploader"></div>
        </div>
      `;
      renderProofUploader(document.getElementById('checkoutProofUploader'), {
        orderNumber: order.number,
        email: order.customer.email,
        rejectionReason: declined ? payment.rejectionReason : null,
        onSuccess: (updated) => {
          authStore.cacheOrder(updated);
          if (authStore.isLoggedIn()) authStore.refreshPayments();
          setTimeout(() => showOrderSuccessScreen(updated), 900);
        }
      });
    }
  }

  renderGuestAccountOffer(order);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Convidado: propõe criar conta com os dados já preenchidos (só falta a palavra-passe).
// A API associa automaticamente as encomendas feitas com o mesmo e-mail.
function renderGuestAccountOffer(order) {
  const box = document.getElementById('successCreateAccount');
  if (!box) return;
  if (authStore.isLoggedIn()) {
    box.hidden = true;
    return;
  }
  if (box.dataset.order === order.number) return; // já desenhado para esta encomenda
  box.dataset.order = order.number;
  box.hidden = false;

  box.innerHTML = `
    <h3 class="success-account-title">Guarde esta encomenda numa conta TradeX</h3>
    <p class="success-account-text">Acompanhe todas as encomendas e pagamentos num só lugar. Usamos os dados desta compra (<strong>${escapeHtml(order.customer.email)}</strong>); só falta escolher a palavra-passe.</p>
    <form class="success-account-form" id="guestAccountForm" novalidate>
      <label for="guestAccountPassword" class="proof-upload-label">Palavra-passe *</label>
      <input type="password" id="guestAccountPassword" class="checkout-input" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
      <button type="submit" class="btn-dark">Criar conta</button>
      <p class="proof-upload-feedback" id="guestAccountFeedback" role="status" aria-live="polite"></p>
    </form>`;

  const form = box.querySelector('#guestAccountForm');
  const feedback = box.querySelector('#guestAccountFeedback');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = box.querySelector('#guestAccountPassword').value;
    if (password.length < 8) {
      feedback.textContent = 'A palavra-passe deve ter pelo menos 8 caracteres.';
      feedback.className = 'proof-upload-feedback error';
      return;
    }
    const [firstName, ...rest] = (order.customer.name || '').trim().split(/\s+/);
    const btn = form.querySelector('button');
    btn.disabled = true;
    const result = await authStore.register({
      firstName: firstName || 'Cliente',
      lastName: rest.join(' '),
      email: order.customer.email,
      phone: order.customer.phone,
      password
    });
    btn.disabled = false;

    if (result.ok) {
      box.innerHTML = `
        <h3 class="success-account-title">Conta criada</h3>
        <p class="success-account-text">A encomenda ${order.number} já está na sua conta. <a href="cliente">Abrir a área do cliente &rarr;</a></p>`;
      return;
    }
    feedback.className = 'proof-upload-feedback error';
    feedback.innerHTML = /já existe/i.test(result.message || '')
      ? 'Já existe uma conta com este e-mail. <button type="button" class="btn-text-link" id="guestAccountLogin">Iniciar sessão</button> para ver esta encomenda.'
      : escapeHtml(result.message);
    box.querySelector('#guestAccountLogin')?.addEventListener('click', () => openAuthModal('login'));
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  renderShippingConfigLabels();
  renderCheckoutOrderSummary();
  setupCustomerSection();
  setupAddressSection();
  bindAddressHandlers();
  setupOptionsSection();
  setupCheckoutSubmission();

  document.getElementById('btnPrintReceipt')?.addEventListener('click', () => window.print());

  // Prazos e taxas definidos no backoffice
  window.addEventListener('tradex:shipping-config-changed', () => {
    renderShippingConfigLabels();
    renderCheckoutOrderSummary();
  });
  loadShippingConfig();

  // Dados da conta (moradas) chegam depois da sincronização
  window.addEventListener('tradex:auth-changed', () => {
    setupCustomerSection();
    setupAddressSection();
  });
  window.addEventListener('tradex:account-synced', setupAddressSection);
  window.addEventListener('tradex:cart-changed', (e) => { if (e.detail?.source === 'server') renderCheckoutOrderSummary(); });
});
