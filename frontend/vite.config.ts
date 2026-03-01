import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // @ts-ignore - Disable host check for Emergent preview
      disableHostCheck: true,
      allowedHosts: [
        'all',
        '.preview.emergentcf.cloud',
        'app-publisher-57.cluster-10.preview.emergentcf.cloud',
        'localhost'
      ],
      proxy: {
        '/api': {
          target: 'https://gestor-pericial-production.up.railway.app',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
      hmr: {
        clientPort: 3000,
        host: 'localhost',
      },
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
