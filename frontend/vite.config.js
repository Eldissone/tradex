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
      },
    },
  },
});
