import { defineConfig } from 'vite';
import { resolve } from 'path';

// URLs amigáveis: /catalogo em vez de /catalogo.html (dev e preview).
// Em produção, o servidor web deve fazer o mesmo (ver docs/operacao.md).
const PAGES = ['catalogo', 'produto', 'rastreio', 'checkout', 'cliente', 'admin', 'redefinir-password'];
function cleanUrls() {
  const middleware = (req, res, next) => {
    const [path, query = ''] = (req.url || '').split('?');
    const suffix = query ? '?' + query : '';
    const legacy = path.match(/^\/(.+)\.html$/);
    if (legacy && (legacy[1] === 'index' || PAGES.includes(legacy[1]))) {
      res.statusCode = 301;
      res.setHeader('Location', (legacy[1] === 'index' ? '/' : '/' + legacy[1]) + suffix);
      return res.end();
    }
    const clean = path.replace(/\/$/, '').slice(1);
    if (PAGES.includes(clean)) req.url = '/' + clean + '.html' + suffix;
    next();
  };
  return {
    name: 'clean-urls',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); }
  };
}

export default defineConfig({
  plugins: [cleanUrls()],
  server: { 
    port: 5174,
    host: '0.0.0.0'
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        catalogo: resolve(__dirname, 'catalogo.html'),
        produto: resolve(__dirname, 'produto.html'),
        rastreio: resolve(__dirname, 'rastreio.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        cliente: resolve(__dirname, 'cliente.html'),
        admin: resolve(__dirname, 'admin.html'),
        redefinirPassword: resolve(__dirname, 'redefinir-password.html'),
      },
    },
  },
});
