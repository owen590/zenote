import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 添加代理配置解决跨域问题
  server: {
    proxy: {
      // 坚果云 WebDAV 代理 - 更宽松的配置
      '/dav': {
        target: 'https://dav.jianguoyun.com',
        changeOrigin: true,
        secure: false, // 允许不安全的 HTTPS
        rewrite: (path) => path.replace(/^\/dav/, '/dav'), // 保留 /dav 路径
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        },
        configure: (proxy, options) => {
          // 禁用代理的预请求检查，允许所有请求方法
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url, 'to', options.target + proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response:', proxyRes.statusCode, req.url);
          });
        },
        // 允许所有请求方法，包括 WebDAV 特殊方法
        ws: false,
        // 增加超时时间
        timeout: 60000
      }
    }
  }
})
