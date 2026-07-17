import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 시 백엔드(insure-backend, :3000)로 /api 프록시.
// 백엔드 미기동 시에도 프론트는 목데이터 폴백으로 동작한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
