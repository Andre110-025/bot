import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  base: '/',
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'ChatbotWidget',
      fileName: 'chatbot-widget',
      formats: ['iife'],
    },
    cssCodeSplit: false, // Keep all CSS in one bundle
    rollupOptions: {
      output: {
        // Ensure CSS is inlined in the JS file
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'chatbot-widget.css'
          }
          return assetInfo.name
        },
      },
    },
  },
})
