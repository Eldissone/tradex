// Visualizador de documentos (PDF/imagem) num painel lateral à direita.
// openDocViewer({ title, subtitle, loadBlob }) — loadBlob devolve { ok, blob, message }.

let current = null;

function ensureElements() {
  let root = document.getElementById('docViewerRoot');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'docViewerRoot';
  root.className = 'doc-viewer-root';
  root.innerHTML = `
    <div class="doc-viewer-backdrop" data-doc-close></div>
    <aside class="doc-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="docViewerTitle">
      <header class="doc-viewer-header">
        <div class="doc-viewer-heading">
          <h2 class="doc-viewer-title" id="docViewerTitle"></h2>
          <p class="doc-viewer-subtitle" id="docViewerSubtitle"></p>
        </div>
        <a class="doc-viewer-icon-btn" id="docViewerDownload" title="Descarregar" aria-label="Descarregar" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </a>
        <button type="button" class="doc-viewer-icon-btn" data-doc-close title="Fechar" aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </header>
      <div class="doc-viewer-body" id="docViewerBody"></div>
    </aside>`;
  document.body.appendChild(root);
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-doc-close]')) closeDocViewer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) closeDocViewer();
  });
  return root;
}

export function closeDocViewer() {
  const root = document.getElementById('docViewerRoot');
  if (!root) return;
  root.classList.remove('open');
  document.body.classList.remove('doc-viewer-open');
  if (current?.url) URL.revokeObjectURL(current.url);
  current = null;
  const body = document.getElementById('docViewerBody');
  if (body) body.innerHTML = '';
}

export async function openDocViewer({ title, subtitle = '', fileName = 'documento', loadBlob }) {
  const root = ensureElements();
  if (current?.url) URL.revokeObjectURL(current.url);
  current = null;

  const body = root.querySelector('#docViewerBody');
  const download = root.querySelector('#docViewerDownload');
  root.querySelector('#docViewerTitle').textContent = title || 'Documento';
  root.querySelector('#docViewerSubtitle').textContent = subtitle;
  download.hidden = true;
  body.innerHTML = '<p class="doc-viewer-message">A carregar documento…</p>';
  root.classList.add('open');
  document.body.classList.add('doc-viewer-open');
  const ticket = {};
  current = ticket;

  const res = await loadBlob();
  if (current !== ticket) return; // fechado ou substituído entretanto
  if (!res.ok) {
    body.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'doc-viewer-message';
    p.textContent = res.message || 'Não foi possível abrir o documento.';
    body.appendChild(p);
    return;
  }

  ticket.url = URL.createObjectURL(res.blob);
  body.innerHTML = '';
  const isImage = res.blob.type.startsWith('image/');
  const el = document.createElement(isImage ? 'img' : 'iframe');
  el.className = isImage ? 'doc-viewer-image' : 'doc-viewer-frame';
  el.src = ticket.url;
  el.title = title || 'Documento';
  if (isImage) el.alt = title || 'Documento';
  body.appendChild(el);
  download.href = ticket.url;
  download.download = fileName;
  download.hidden = false;
}
