import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this from a project sub-path; everywhere else (Vercel,
// Netlify, `vite preview`) it is served from the domain root. Getting this
// wrong produces a blank page: index.html asks for assets under the wrong
// prefix, they 404, and nothing runs.
// BASE_PATH overrides both, for a host that needs some third prefix.
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS ? '/moving-the-needle/' : '/');

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: `${base}index.html`,
      },
      manifest: {
        name: 'Moving the Needle',
        short_name: 'Needle',
        description: 'After a gap, the one physical thing to do next.',
        id: base,
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
