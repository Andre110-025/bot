// import { fileURLToPath, URL } from 'node:url'

// import { defineConfig } from 'vite'
// import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [vue(), vueDevTools()],
//   resolve: {
//     alias: {
//       '@': fileURLToPath(new URL('./src', import.meta.url)),
//     },
//   },
//   build: {
//     lib: {
//       entry: 'src/main.js', // your chatbot entry point
//       name: 'NexDreChatbot', // global variable
//       fileName: 'chatbot-widget', // output filename
//       formats: ['iife'], // Immediately Invoked Function Expression
//     },
//     rollupOptions: {
//       external: [], // make sure Vue and your dependencies are bundled
//     },
//   },
// })

// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(), // This plugin is essential for handling .vue files
  ],
  build: {
    // 1. Output as a library (single file)
    lib: {
      entry: resolve(__dirname, 'src/main.js'), // Point to the new entry file
      name: 'ChatbotWidget',
      formats: ['iife'], // IIFE is best for a simple, global drop-in script
      fileName: 'chatbot-widget',
    },

    // 2. Inline all CSS into the JS file
    cssCodeSplit: false,

    // 3. Clear the output directory
    emptyOutDir: true,
  },
})
