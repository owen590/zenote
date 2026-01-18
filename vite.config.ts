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
          // 只代理 /dav 路径，避免影响主应用
          '/dav': {
            target: 'https://dav.jianguoyun.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path,
            configure: (proxy, options) => {
              // Add debug logging
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('Proxy Request:', req.method, req.url, '->', options.target + proxyReq.path);
                
                // 确保传递所有必要的请求头
                if (req.headers.authorization) {
                  proxyReq.setHeader('Authorization', req.headers.authorization);
                }
                if (req.headers['content-type']) {
                  proxyReq.setHeader('Content-Type', req.headers['content-type']);
                }
                if (req.headers['user-agent']) {
                  proxyReq.setHeader('User-Agent', req.headers['user-agent']);
                }
                if (req.headers.depth) {
                  proxyReq.setHeader('Depth', req.headers.depth);
                }
                
                // 设置坚果云需要的特殊头
                proxyReq.setHeader('Accept', '*/*');
                proxyReq.setHeader('Cache-Control', 'no-cache');
              });
              
              proxy.on('proxyRes', (proxyRes, req, res) => {
                console.log('Proxy Response:', proxyRes.statusCode, req.method, req.url);
                if (proxyRes.statusCode >= 400) {
                  console.log('Response Headers:', proxyRes.headers);
                }
              });
              
              proxy.on('error', (err, req, res) => {
                console.error('Proxy Error:', err, req.method, req.url);
              });
            },
            // 允许所有请求方法，包括 WebDAV 特殊方法
            ws: false,
            // 增加超时时间
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
