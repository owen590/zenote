import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // WebDAV proxy configuration for development environment
          '^/dav': {
            target: 'https://dav.jianguoyun.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': '*/*',
              'Connection': 'keep-alive'
            },
            configure: (proxy, options) => {
              // Add debug logging
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('Proxy Request:', req.method, req.url, '->', options.target + proxyReq.path);
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                console.log('Proxy Response:', proxyRes.statusCode, req.method, req.url);
              });
              proxy.on('error', (err, req, res) => {
                console.error('Proxy Error:', err, req.method, req.url);
              });
            },
            timeout: 60000
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
