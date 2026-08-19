import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Project pages live at /moving-the-needle/. Relative asset paths keep the
// build working from a file server or a sub-path alike.
export default defineConfig({
  base: '/moving-the-needle/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/moving-the-needle/index.html',
      },
      manifest: {
        name: 'Moving the Needle',
        short_name: 'Needle',
        description: 'After a gap, the one physical thing to do next.',
        id: '/moving-the-needle/',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#101418',
        theme_color: '#101418',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
});
