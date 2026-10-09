import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/exam-recall-dashboard/',
  publicDir: process.env.DASHBOARD_FIXTURE_DIR || 'public',
  build: { sourcemap: false },
});
