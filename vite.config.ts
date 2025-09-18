import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },

      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          '/api/prescribers': {
            target: 'https://api.rxprescribers.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/prescribers/, '/api.php'),
            configure: (proxy, options) => {
              proxy.on('error', (err, req, res) => {
                console.log('Proxy error:', err);
              });
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('Sending Request:', req.method, req.url);
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                console.log('Received Response:', proxyRes.statusCode, req.url);
              });
            }
          }
        }
      }
    };
});
