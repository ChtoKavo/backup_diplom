import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Минификация кода
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    // Оптимизация размера бандла
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Разделяем крупные библиотеки в отдельные чанки
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/socket.io')) {
            return 'socket-vendor';
          }
        },
      },
    },
    // Использование gzip сжатия
    reportCompressedSize: true,
    // Больший лимит для предупреждений о размере
    chunkSizeWarningLimit: 600,
  },
  server: {
    // Для разработки
    host: '0.0.0.0',
    port: 3000,
  },
})
