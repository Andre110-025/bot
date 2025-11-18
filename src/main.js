// src/main.js - The new entry file for the custom element build
import { defineCustomElement } from 'vue'
import AppVue from './App.vue'

// IMPORTANT: Define all sub-components used by App.vue as custom elements
// so they are properly bundled and rendered within the Shadow DOM.

// 1. Import Sub-Components
import SignInForm from './components/SignInForm.vue'
import AdminChatSection from './components/AdminChatSection.vue'
import getUserId from './components/utils/userId'

// 2. Convert Sub-Components to Custom Elements
const SignInElement = defineCustomElement(SignInForm)
const AdminChatElement = defineCustomElement(AdminChatSection)
const getIdElement = defineCustomElement(getUserId)

customElements.define('sign-in-form', SignInElement)
customElements.define('admin-chat-section', AdminChatElement)
customElements.define('get-user-id', getIdElement)

// 3. Register Sub-Components (Optional but recommended for consistency)
// The tag names must match the way you use them in App.vue's template
// or you must register them manually inside App.vue's component property.
// However, since they are standard Vue components in App.vue,
// they should be bundled correctly by Vite/Rollup.

// We will skip global registration of sub-components here and rely on
// Vue/Vite's bundling for a cleaner output.

// 4. Define the Main Chatbot Custom Element
const ChatbotElement = defineCustomElement(AppVue, {
  styles: AppVue.styles,
  props: ['website', 'api'],
})

// 5. Register the Main Chatbot Tag
customElements.define('chatbot-widget', ChatbotElement)

// 6. Optional: Export for manual instantiation
export default ChatbotElement
