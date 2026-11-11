// TradeX Global Trading - Redefinição de palavra-passe a partir do link enviado por e-mail
import { api } from './api.js';
import { openAuthModal } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetPasswordForm');
  const feedback = document.getElementById('resetFeedback');
  const lead = document.getElementById('resetLead');

  // Lê o token e retira-o da barra de endereço (não fica no histórico nem é partilhado por engano)
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) window.history.replaceState({}, '', window.location.pathname);

  const show = (msg, kind) => {
    feedback.innerHTML = msg;
    feedback.className = `proof-upload-feedback ${kind}`;
  };

  if (!token) {
    form.hidden = true;
    lead.innerHTML = 'Este link não é válido. Peça um novo link em <button type="button" class="btn-text-link" id="resetRequestNew">Esqueceu-se da palavra-passe?</button>';
    document.getElementById('resetRequestNew')?.addEventListener('click', () => openAuthModal('login'));
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('resetNewPassword').value;
    const confirm = document.getElementById('resetConfirmPassword').value;

    if (password.length < 8) return show('A palavra-passe deve ter pelo menos 8 caracteres.', 'error');
    if (password !== confirm) return show('As palavras-passe não coincidem.', 'error');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const res = await api.auth.resetPassword(token, password);
    btn.disabled = false;

    if (!res.ok) return show(res.message || 'Não foi possível redefinir a palavra-passe.', 'error');

    form.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
    show('Palavra-passe alterada. <button type="button" class="btn-text-link" id="resetGoLogin">Iniciar sessão</button>', 'success');
    document.getElementById('resetGoLogin')?.addEventListener('click', () => openAuthModal('login'));
  });
});
