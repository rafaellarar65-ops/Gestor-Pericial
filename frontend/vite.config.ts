import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hmrHost = env.VITE_HMR_HOST?.trim();
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT?.trim();
  const hmrConfig = {
    ...(hmrHost ? { host: hmrHost } : {}),
    ...(hmrClientPort ? { clientPort: Number(hmrClientPort) } : {}),
  };

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
          credentials: 'include',
        },
      },
      hmr: Object.keys(hmrConfig).length > 0 ? hmrConfig : undefined,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
      __API_URL__: JSON.stringify(env.VITE_API_URL ?? 'https://gestor-pericial-production.up.railway.app'),
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
