import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetBackend = env.VITE_API_BASE_URL || 'https://phishsentry.onrender.com';

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) {
              return 'vendor-three';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          }
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/predict': {
          target: targetBackend,
          changeOrigin: true,
          secure: false
        },
        '/health': {
          target: targetBackend,
          changeOrigin: true,
          secure: false
        },
        '/api': {
          target: targetBackend,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
