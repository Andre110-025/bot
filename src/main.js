import { createApp } from 'vue'
import App from './App.vue'

// Store initialized widgets to prevent double-mounting
const initializedWidgets = new WeakSet()

// Auto-initialize function
function initChatbot() {
  // Find all chatbot-widget elements
  const widgets = document.querySelectorAll('chatbot-widget')

  widgets.forEach((widget) => {
    // Skip if already initialized
    if (initializedWidgets.has(widget)) {
      return
    }

    const website = widget.getAttribute('website') || 'N/A'
    const api = widget.getAttribute('api') || 'N/A'

    // Create a div to mount Vue app
    const mountPoint = document.createElement('div')
    widget.appendChild(mountPoint)

    // Create and mount Vue app
    const app = createApp(App, {
      website,
      api,
    })

    app.mount(mountPoint)

    // Mark as initialized
    initializedWidgets.add(widget)
  })
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot)
} else {
  // DOM is already ready, but give script a tick to ensure everything is loaded
  setTimeout(initChatbot, 0)
}

// Watch for new chatbot-widget elements (optional but useful)
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => {
    initChatbot() // Re-run init, it will skip already initialized widgets
  })

  // Start observing after a short delay to ensure DOM is ready
  setTimeout(() => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }, 100)
}

// Expose for manual re-initialization if needed
window.initChatbot = initChatbot
