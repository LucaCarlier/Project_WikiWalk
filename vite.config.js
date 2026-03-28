import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-group.svg'],
      devOptions: {
        enabled: true // DIT zorgt ervoor dat je het manifest ziet tijdens 'npm run dev'
      },
      manifest: {
        name: 'WikiWalk Gent',
        short_name: 'WikiWalk',
        description: 'Historische stadswandeling door Gent met live GPS',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [{
            src: 'pwa-192x192.png',
            sizes: '224x224',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '224x224',
            type: 'image/png',
            purpose: 'any maskable'
          }]
      }
    })
  ]
});