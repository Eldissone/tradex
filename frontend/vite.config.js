import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
