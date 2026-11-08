// TradeX Global Trading - Checkout & Gestão de Encomendas
import { cartStore } from './cart.js';
import { authStore } from './auth.js';

let checkoutState = {
  deliveryMethod: 'pickup', // pickup | delivery_luanda | delivery_interprovincial
  shippingMode: 'sea_lcl',  // sea_lcl | air_exp
  paymentMethod: 'mcx_express', // mcx_express | mcx_reference | bank_transfer
  selectedAddressId: null,
  deliveryCostAoa: 0,
  internationalFreightAoa: 0,
  customsInsuranceAoa: 0
};

// Cálculo de encargos e frete
function calculateBreakdown(items) {
  const subtotal = items.reduce((acc, i) => acc + (i.priceAoa * i.quantity), 0);
  
  // Frete Internacional baseado na modalidade
  let freightRate = checkoutState.shippingMode === 'air_exp' ? 0.18 : 0.08;
  const internationalFreight = Math.round(subtotal * freightRate);

  // Despacho aduaneiro e seguro de carga (4% CIF estimado)
  const customsInsurance = Math.round((subtotal + internationalFreight) * 0.04);

  // Entrega local
  let deliveryCost = 0;
  if (checkoutState.deliveryMethod === 'delivery_luanda') {
    deliveryCost = 15000;
  } else if (checkoutState.deliveryMethod === 'delivery_interprovincial') {
    deliveryCost = 35000;
  }

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
    listEl.innerHTML = items.map(item => `
      <div class="checkout-item-row">
        <div class="checkout-item-thumb">
          <img src="${item.images && item.images[0] ? item.images[0] : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'}" alt="${item.title}" />
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
    `).join('');
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
function setupAddressSection() {
  const addresses = authStore.getAddresses();
  const container = document.getElementById('savedAddressesList');
  const newAddrForm = document.getElementById('newAddressForm');
  const btnToggleNew = document.getElementById('btnToggleNewAddress');

  if (container && addresses.length > 0) {
    container.innerHTML = addresses.map((addr, idx) => `
      <label class="address-card-label ${addr.isDefault || idx === 0 ? 'active' : ''}">
        <input type="radio" name="selectedAddress" value="${addr.id}" ${addr.isDefault || idx === 0 ? 'checked' : ''} />
        <div class="address-card-content">
          <div class="address-card-header">
            <strong class="address-label-name">${addr.label || 'Endereço de Entrega'}</strong>
            ${addr.isDefault ? '<span class="address-default-badge">Principal</span>' : ''}
          </div>
          <p class="address-recipient">${addr.recipientName} • ${addr.phone}</p>
          <p class="address-street">${addr.street}, ${addr.municipality}, ${addr.province}</p>
          ${addr.reference ? `<p class="address-ref">Ref: ${addr.reference}</p>` : ''}
        </div>
      </label>
    `).join('');

    checkoutState.selectedAddressId = addresses[0].id;

    container.querySelectorAll('input[name="selectedAddress"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        checkoutState.selectedAddressId = e.target.value;
        container.querySelectorAll('.address-card-label').forEach(l => l.classList.remove('active'));
        e.target.closest('.address-card-label')?.classList.add('active');
      });
    });
  }

  btnToggleNew?.addEventListener('click', () => {
    newAddrForm?.classList.toggle('visible');
  });

  // Salvar novo endereço
  document.getElementById('btnSaveNewAddress')?.addEventListener('click', (e) => {
    e.preventDefault();
    const label = document.getElementById('newAddrLabel')?.value;
    const recipient = document.getElementById('newAddrRecipient')?.value;
    const phone = document.getElementById('newAddrPhone')?.value;
    const province = document.getElementById('newAddrProvince')?.value;
    const municipality = document.getElementById('newAddrMunicipality')?.value;
    const street = document.getElementById('newAddrStreet')?.value;
    const ref = document.getElementById('newAddrRef')?.value;

    if (!recipient || !phone || !street || !municipality) {
      alert('Por favor, preencha todos os campos obrigatórios do endereço.');
      return;
    }

    const saved = authStore.saveAddress({
      label: label || 'Morada de Entrega',
      recipientName: recipient,
      phone,
      province,
      municipality,
      street,
      reference: ref,
      isDefault: false
    });

    setupAddressSection();
    if (newAddrForm) newAddrForm.classList.remove('visible');
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
  // Modalidade de Frete
  document.querySelectorAll('input[name="shippingMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      checkoutState.shippingMode = e.target.value;
      renderCheckoutOrderSummary();
    });
  });

  // Método de Pagamento
  const mcxExpressFields = document.getElementById('paymentMcxExpressFields');
  const mcxRefFields = document.getElementById('paymentMcxRefFields');
  const bankTransferFields = document.getElementById('paymentBankTransferFields');

  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      checkoutState.paymentMethod = e.target.value;

      mcxExpressFields?.classList.toggle('visible', checkoutState.paymentMethod === 'mcx_express');
      mcxRefFields?.classList.toggle('visible', checkoutState.paymentMethod === 'mcx_reference');
      bankTransferFields?.classList.toggle('visible', checkoutState.paymentMethod === 'bank_transfer');
    });
  });
}

// Submissão e Confirmação da Compra (Criação da Encomenda)
function setupCheckoutSubmission() {
  const form = document.getElementById('checkoutMainForm');
  const submitBtn = document.getElementById('btnConfirmOrder');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const items = cartStore.getItems();
    if (items.length === 0) {
      alert('O seu pedido está vazio.');
      return;
    }

    // Coleta dos dados do cliente
    let customerName = document.getElementById('custFullName')?.value;
    let customerEmail = document.getElementById('custEmail')?.value;
    let customerPhone = document.getElementById('custPhone')?.value;
    let customerNif = document.getElementById('custNif')?.value;

    const user = authStore.getUser();
    if (user && !customerName) {
      customerName = `${user.firstName} ${user.lastName}`;
      customerEmail = user.email;
      customerPhone = user.phone;
    }

    if (!customerName || !customerEmail || !customerPhone) {
      alert('Por favor, preencha o seu nome, e-mail e telefone de contacto.');
      return;
    }

    const breakdown = calculateBreakdown(items);

    // Geração de Código Único de Encomenda
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `TDX-AO-2026-${randomSuffix}`;
    const orderId = `ord_${Date.now()}`;

    // Obtenção da morada selecionada
    const addresses = authStore.getAddresses();
    const selectedAddress = addresses.find(a => a.id === checkoutState.selectedAddressId) || addresses[0] || {
      province: 'Luanda',
      municipality: 'Talatona',
      street: 'Terminal TradeX Bairro Azul'
    };

    // Montagem da Encomenda Completa com Máquina de Estados
    const newOrder = {
      id: orderId,
      number: orderNumber,
      createdAt: new Date().toISOString(),
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        nif: customerNif || 'Consumidor Final'
      },
      status: 'AWAITING_PAYMENT',
      statusText: 'Aguardando Pagamento',
      items: items.map(i => ({
        id: i.id,
        title: i.title,
        priceAoa: i.priceAoa,
        quantity: i.quantity,
        subtotal: i.priceAoa * i.quantity,
        image: i.images && i.images[0] ? i.images[0] : null
      })),
      financial: {
        subtotalAoa: breakdown.subtotal,
        internationalFreightAoa: breakdown.internationalFreight,
        customsInsuranceAoa: breakdown.customsInsurance,
        deliveryCostAoa: breakdown.deliveryCost,
        totalAoa: breakdown.grandTotal
      },
      logistics: {
        shippingMode: checkoutState.shippingMode === 'air_exp' ? 'Aéreo Expresso Internacional' : 'Marítimo LCL Consolidado',
        deliveryMethod: checkoutState.deliveryMethod,
        origin: 'Hub Consolidado Yiwu / Guangzhou (China)',
        destination: `Luanda, Angola (${selectedAddress.municipality})`,
        address: selectedAddress,
        estimatedDeliveryDays: checkoutState.shippingMode === 'air_exp' ? '7 a 12 dias' : '35 a 45 dias'
      },
      payment: {
        method: checkoutState.paymentMethod,
        methodName: checkoutState.paymentMethod === 'mcx_express' 
          ? 'Multicaixa Express (MCX)' 
          : checkoutState.paymentMethod === 'mcx_reference' 
            ? 'Referência Multicaixa' 
            : 'Transferência Bancária',
        status: 'PENDING',
        reference: checkoutState.paymentMethod === 'mcx_reference' ? `928 440 ${randomSuffix}` : null,
        entity: checkoutState.paymentMethod === 'mcx_reference' ? '00142' : null,
        phone: checkoutState.paymentMethod === 'mcx_express' ? document.getElementById('mcxPhoneInput')?.value || customerPhone : null
      },
      history: [
        {
          status: 'AWAITING_PAYMENT',
          label: 'Encomenda Registada',
          date: new Date().toISOString(),
          note: 'Aguardando liquidação do valor total em Kwanzas.',
          responsible: 'Sistema TradeX'
        }
      ]
    };

    // Salva na base de dados local
    authStore.saveOrder(newOrder);

    // Limpa o carrinho
    cartStore.clear();

    // Exibe tela de confirmação e recibo
    showOrderSuccessScreen(newOrder);
  });
}

// Processamento de Webhook e Simulação de Pagamento
function handlePaymentWebhook(order, newStatus, transactionId) {
  order.payment.status = newStatus;
  if (transactionId) {
    order.payment.transactionId = transactionId;
  }

  const now = new Date().toISOString();

  if (newStatus === 'APPROVED') {
    order.status = 'PROCESSING_SUPPLIER';
    order.history.unshift({
      status: 'PROCESSING_SUPPLIER',
      label: 'Compra Junto do Fornecedor',
      date: now,
      note: 'Pagamento conciliado com sucesso. Pedido de aquisição emitido para o fabricante na China.',
      responsible: 'TradeX Supply Hub Guangzhou'
    });
    order.history.unshift({
      status: 'PAYMENT_CONFIRMED',
      label: 'Pagamento Confirmado em Kwanzas',
      date: now,
      note: `Transação aprovada via ${order.payment.methodName} (Ref: ${transactionId}).`,
      responsible: 'Gateway Multicaixa / EMIS'
    });

    authStore.savePayment({
      id: `pay_${Date.now()}`,
      orderNumber: order.number,
      amountAoa: order.financial.totalAoa,
      method: order.payment.method,
      methodName: order.payment.methodName,
      status: 'APPROVED',
      transactionId: transactionId,
      date: now
    });
  } else if (newStatus === 'REJECTED') {
    order.history.unshift({
      status: 'PAYMENT_FAILED',
      label: 'Pagamento Recusado / Expirado',
      date: now,
      note: 'Tentativa de liquidação cancelada ou recusada pelo emissor.',
      responsible: 'Gateway Multicaixa'
    });
  } else if (newStatus === 'REVIEW_PENDING') {
    order.history.unshift({
      status: 'REVIEW_PENDING',
      label: 'Comprovativo Bancário Submetido',
      date: now,
      note: `Comprovativo de transferência submetido (Ref: ${transactionId}). Aguardando validação da tesouraria.`,
      responsible: 'Cliente TradeX'
    });
  }

  authStore.saveOrder(order);
  showOrderSuccessScreen(order);
}

// Exibição da Tela de Confirmação & Recibo Oficial
function showOrderSuccessScreen(order) {
  const mainLayout = document.getElementById('checkoutMainLayout');
  const successScreen = document.getElementById('checkoutSuccessScreen');
  if (!successScreen) return;

  if (mainLayout) mainLayout.classList.add('hidden');
  successScreen.classList.add('visible');

  // Preenche dados do recibo
  const elNum = document.getElementById('successOrderNumber');
  const elDate = document.getElementById('successOrderDate');
  const elTotal = document.getElementById('successOrderTotal');
  const elCustomer = document.getElementById('successCustomerName');
  const elMethod = document.getElementById('successPaymentMethod');
  const elDetailsBox = document.getElementById('successPaymentDetails');
  const elTrackLink = document.getElementById('btnTrackSuccessOrder');

  if (elNum) elNum.textContent = order.number;
  if (elDate) elDate.textContent = new Date(order.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (elTotal) elTotal.textContent = cartStore.formatAoa(order.financial.totalAoa);
  if (elCustomer) elCustomer.textContent = `${order.customer.name} (${order.customer.email})`;
  if (elMethod) elMethod.textContent = order.payment.methodName;

  if (elTrackLink) {
    elTrackLink.href = `rastreio.html?codigo=${encodeURIComponent(order.number)}`;
  }

  // Detalhes do pagamento de acordo com o método e estado
  if (elDetailsBox) {
    const isApproved = order.payment.status === 'APPROVED';
    const isRejected = order.payment.status === 'REJECTED';
    const isReview = order.payment.status === 'REVIEW_PENDING';

    if (isApproved) {
      elDetailsBox.innerHTML = `
        <div class="payment-confirmed-box">
          <div class="confirmed-badge-row">
            <span class="confirmed-pill">PAGAMENTO APROVADO & CONCILIADO</span>
            <span class="confirmed-time">${new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <h3 class="confirmed-title">Liquidação em Kwanzas Concluída com Sucesso</h3>
          <p class="confirmed-text">O valor de <strong>${cartStore.formatAoa(order.financial.totalAoa)}</strong> foi validado pela rede Multicaixa. A encomenda avançou imediatamente para a fase de aquisição junto dos fabricantes e preparação para transporte internacional.</p>
          <div class="confirmed-meta-grid">
            <div>
              <span>ID da Transação:</span>
              <strong>${order.payment.transactionId || 'MCX-TXN-2026-98421'}</strong>
            </div>
            <div>
              <span>Canal de Liquidação:</span>
              <strong>${order.payment.methodName}</strong>
            </div>
            <div>
              <span>Selo Fiscal / AGT:</span>
              <strong>CONFORME (RUPE-EMIS-AO)</strong>
            </div>
          </div>
        </div>
      `;
    } else if (isRejected) {
      elDetailsBox.innerHTML = `
        <div class="payment-rejected-box">
          <div class="rejected-badge-row">
            <span class="rejected-pill">TRANSAÇÃO RECUSADA</span>
          </div>
          <h3 class="rejected-title">Não foi possível processar o pagamento</h3>
          <p class="rejected-text">A operação foi cancelada ou o tempo limite foi excedido. Pode tentar novamente agora ou escolher outro método de liquidação.</p>
          <button type="button" class="btn-dark btn-retry-payment" id="btnRetryPayment">Tentar Pagamento Novamente</button>
        </div>
      `;
      document.getElementById('btnRetryPayment')?.addEventListener('click', () => {
        order.payment.status = 'PENDING';
        authStore.saveOrder(order);
        showOrderSuccessScreen(order);
      });
    } else if (isReview) {
      elDetailsBox.innerHTML = `
        <div class="payment-review-box">
          <div class="review-badge-row">
            <span class="review-pill">COMPROVATIVO EM VALIDAÇÃO</span>
          </div>
          <h3 class="review-title">Comprovativo de Transferência Submetido</h3>
          <p class="review-text">O seu documento de transferência bancária foi rececionado e está sob conferência pelo departamento financeiro da TradeX Global em Luanda. Prazo habitual de validação: até 2 horas úteis.</p>
        </div>
      `;
    } else {
      // Estado PENDING - Mostra simulador do Gateway e instruções
      if (order.payment.method === 'mcx_express') {
        elDetailsBox.innerHTML = `
          <div class="payment-instruction-box">
            <div class="inst-pill">MULTICAIXA EXPRESS (AGUARDANDO APROVAÇÃO)</div>
            <p>Enviamos uma solicitação de débito de <strong>${cartStore.formatAoa(order.financial.totalAoa)}</strong> para o telemóvel <strong>${order.payment.phone || '+244 9xx xxx xxx'}</strong>.</p>
            <p class="inst-sub">Abra a sua aplicação <strong>Multicaixa Express</strong> no smartphone para autorizar a operação com o seu PIN.</p>
            
            <!-- Simulador do Gateway de Pagamento Multicaixa -->
            <div class="gateway-simulation-card">
              <span class="sim-badge">SIMULADOR DE GATEWAY / WEBHOOK MULTICAIXA</span>
              <p class="sim-desc">Teste a integração de pagamentos simulando o retorno da API da EMIS / Gateway de Pagamentos:</p>
              <div class="sim-action-buttons">
                <button type="button" class="btn-gateway-approve" id="btnSimulateApprove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Simular Aprovação no App MCX (Webhook)</span>
                </button>
                <button type="button" class="btn-gateway-reject" id="btnSimulateReject">
                  <span>Simular Recusa / Saldo</span>
                </button>
              </div>
            </div>
          </div>
        `;

        document.getElementById('btnSimulateApprove')?.addEventListener('click', () => {
          handlePaymentWebhook(order, 'APPROVED', `MCX-TXN-${Date.now().toString().slice(-6)}`);
        });

        document.getElementById('btnSimulateReject')?.addEventListener('click', () => {
          handlePaymentWebhook(order, 'REJECTED', null);
        });
      } else if (order.payment.method === 'mcx_reference') {
        elDetailsBox.innerHTML = `
          <div class="payment-instruction-box">
            <div class="inst-pill">REFERÊNCIA MULTICAIXA (ATM / GPO)</div>
            <div class="ref-payment-grid">
              <div>
                <span>Entidade:</span>
                <strong>00142 (TradeX Global)</strong>
              </div>
              <div>
                <span>Referência:</span>
                <strong>${order.payment.reference || '928 440 219'}</strong>
              </div>
              <div>
                <span>Valor Total:</span>
                <strong>${cartStore.formatAoa(order.financial.totalAoa)}</strong>
              </div>
            </div>
            <p class="inst-sub">Pague em qualquer Caixa Automático Multicaixa ou Homebanking na opção "Pagamentos por Referência". Válido por 48 horas.</p>

            <!-- Simulador do Pagamento Multicaixa -->
            <div class="gateway-simulation-card">
              <span class="sim-badge">SIMULADOR DE CONCILIAÇÃO BANCÁRIA GPO</span>
              <p class="sim-desc">Simule o pagamento imediato desta referência via caixa ATM ou Internet Banking:</p>
              <div class="sim-action-buttons">
                <button type="button" class="btn-gateway-approve" id="btnSimulateRefPay">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Simular Pagamento no Caixa Multicaixa</span>
                </button>
              </div>
            </div>
          </div>
        `;

        document.getElementById('btnSimulateRefPay')?.addEventListener('click', () => {
          handlePaymentWebhook(order, 'APPROVED', `ATM-GPO-${Date.now().toString().slice(-6)}`);
        });
      } else {
        elDetailsBox.innerHTML = `
          <div class="payment-instruction-box">
            <div class="inst-pill">TRANSFERÊNCIA BANCÁRIA</div>
            <p>Efetue a transferência para as contas oficiais TradeX Global Trading Lda:</p>
            <ul class="inst-bank-list">
              <li><strong>Banco BFA:</strong> AO06.0006.0000.4491.0294.1018.4</li>
              <li><strong>Banco BAI:</strong> AO06.0040.0000.9918.2231.1029.0</li>
            </ul>
            <p class="inst-sub">Indique o número da encomenda no descritivo da transferência: <strong>${order.number}</strong>.</p>

            <!-- Simulador de Envio de Comprovativo -->
            <div class="gateway-simulation-card">
              <span class="sim-badge">SUBMISSÃO DE COMPROVATIVO BANCÁRIO</span>
              <p class="sim-desc">Simule o envio do recibo bancário em PDF ou imagem para conciliação:</p>
              <div class="sim-action-buttons">
                <button type="button" class="btn-gateway-approve" id="btnSimulateUploadSlip">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Simular Envio de Comprovativo de Depósito</span>
                </button>
              </div>
            </div>
          </div>
        `;

        document.getElementById('btnSimulateUploadSlip')?.addEventListener('click', () => {
          handlePaymentWebhook(order, 'REVIEW_PENDING', `DEP-SLIP-${Date.now().toString().slice(-6)}`);
        });
      }
    }
  }

  // Scroll suave ao topo
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Botão de impressão
  document.getElementById('btnPrintReceipt')?.addEventListener('click', () => {
    window.print();
  });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutOrderSummary();
  setupCustomerSection();
  setupAddressSection();
  setupOptionsSection();
  setupCheckoutSubmission();

  // Ouve mudanças de login para atualizar os dados em tempo real
  window.addEventListener('tradex:auth-changed', () => {
    setupCustomerSection();
    setupAddressSection();
  });
});

