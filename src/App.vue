<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import axios from 'axios'
import SignInForm from './components/SignInForm.vue'
import AdminChatSection from './components/AdminChatSection.vue'
import { SessionManager } from './components/utils/sessionManager'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useChatNotifications } from './composables/useChatNotifications'

const showPopup = ref(false)
const userInput = ref('')
const messages = ref([
  { text: "Hey there, I'm Chatbot convo. How can I help you today?", sender: 'AI' },
])
const typingMessageIndex = ref(-1)
const displayedTexts = ref({})
const chatContainer = ref(null)
const charTimers = {}
const showUserBotChat = ref(true)
const showChat = ref(false)
const showBubble = ref(false)

const props = defineProps({
  website: {
    type: String,
    required: true,
    default: 'N/A',
  },
  api: {
    type: String,
    required: true,
    default: 'N/A',
  },
})

const { hasUnreadMessages, clearUnreadMessages } = useChatNotifications()
const userId = ref('')

const togglePopup = () => {
  showPopup.value = !showPopup.value
  if (showPopup.value) {
    clearUnreadMessages()
  }
}

const formatMessage = (text) => {
  const html = marked(text, { breaks: true })
  return DOMPurify.sanitize(html)
}

const scrollToBottom = () => {
  nextTick(() => {
    const el = chatContainer.value
    if (!el) return
    const messagesContainer = el.querySelector('.cdUser011011-messages-container')
    if (!messagesContainer) return
    const lastMsg = messagesContainer.lastElementChild
    if (lastMsg) {
      lastMsg.scrollIntoView({ behavior: 'smooth', block: 'end' })
    } else {
      el.scrollTop = el.scrollHeight
    }
  })
}

watch(messages, scrollToBottom, { deep: true })
watch(displayedTexts, scrollToBottom, { deep: true })

const saveMessages = () => {
  if (!userId.value) return
  const payload = {
    timestamp: Date.now(),
    messages: messages.value,
  }
  localStorage.setItem(`messages_${userId.value}`, JSON.stringify(payload))
}

const addMessage = (msg) => {
  messages.value.push(msg)
  saveMessages()
}

const typeMessage = (index, fullText) => {
  return new Promise((resolve) => {
    let i = 0
    displayedTexts.value[index] = ''
    typingMessageIndex.value = index

    const msPerChar = 30 + Math.random() * 20

    const step = () => {
      if (i < fullText.length) {
        displayedTexts.value[index] = fullText.slice(0, ++i)
        charTimers[index] = setTimeout(step, msPerChar)
      } else {
        typingMessageIndex.value = -1
        messages.value[index].text = fullText
        clearTimeout(charTimers[index])
        delete charTimers[index]
        resolve()
        saveMessages()
      }
    }
    step()
  })
}

const sendMessage = async () => {
  if (!userInput.value.trim()) return
  const userText = userInput.value.trim()

  addMessage({ text: userText, sender: 'user', createdAt: Date.now() })
  userInput.value = ''
  scrollToBottom()
  await getResponse(userText)
}

const getResponse = async (inputText) => {
  try {
    messages.value.push({ sender: 'AI', isThinking: true })
    const aiIndex = messages.value.length - 1
    scrollToBottom()

    let reply = await getGeminiResponse(inputText)

    if (!reply || typeof reply !== 'string') {
      reply = 'Oops! Something went wrong. Check internet connection and try again.'
    }

    messages.value[aiIndex] = {
      sender: 'AI',
      text: '',
      isThinking: false,
    }

    scrollToBottom()
    await typeMessage(aiIndex, reply)

    const terms = [
      'contact support for more information.',
      'contact support team',
      'contact support',
      'please contact support for more details',
      'support team',
      'contacting support',
      'What specific information are you looking for?',
      'please let me know',
    ]

    const shouldShowButton = terms.some((term) => reply.toLowerCase().includes(term.toLowerCase()))

    if (shouldShowButton) {
      addMessage({
        sender: 'AI',
        isButton: true,
        triggeringMessage: inputText,
      })
      scrollToBottom()
    }
  } catch (err) {
    console.error('API error:', err)
    addMessage({
      text: 'Oops, something went wrong.',
      sender: 'AI',
    })
  } finally {
    scrollToBottom()
  }
}

async function getGeminiResponse(userText) {
  try {
    const response = await axios.post(
      'https://assitance.storehive.com.ng/public/api/chat/message',
      {
        message: userText,
        website: props.website,
        conversation_id: userId.value,
        api: props.api,
        start_admin_chat: false,
      },
    )
    return response.data.data.response
  } catch (err) {
    console.error('Error calling Gemini API:', err)
    return 'Oops! Something went wrong. Check internet connection and try again'
  }
}

const handleFormComplete = (formData) => {
  // Create session with the form data and userId
  SessionManager.createSession(formData, userId.value)
  showChat.value = true
}

const handleAdminRedirect = () => {
  showUserBotChat.value = false
}

const sendToAdmin = async (userMessage = '') => {
  let messageToSend = userMessage.trim()

  if (!messageToSend) {
    messageToSend = 'User requested to speak with a representative.'
  }

  const sessionData = SessionManager.getSessionData()
  const userEmail = sessionData?.email

  showUserBotChat.value = false

  const response = await axios.post('https://assitance.storehive.com.ng/public/api/chat/message', {
    message: messageToSend,
    website: props.website,
    conversation_id: userId.value,
    api: props.api,
    start_admin_chat: true,
    user_email: userEmail,
  })

  // Enable admin mode
  SessionManager.enableAdminMode()
}

const customization = ref(null)

const getCustomization = async () => {
  if (!props.api || !props.website) return

  try {
    const response = await axios.get('https://assitance.storehive.com.ng/public/api/getsettings', {
      params: {
        website: props.website,
        api: props.api,
      },
    })

    if (response.data?.Settings?.length > 0) {
      customization.value = response.data.Settings[0]
      applyCustomizationStyles()
    } else {
      console.warn('No settings found in response')
      applyDefaultStyles()
    }
  } catch (err) {
    console.error('Error fetching customization:', err)
    applyDefaultStyles()
  }
}

const applyCustomizationStyles = () => {
  const root = document.documentElement

  root.style.setProperty('--primary-color', customization.value.primarycolor || '#10b981')
  root.style.setProperty('--secondary-color', customization.value.secondarycolor || '#059669')
  root.style.setProperty('--bubble-size', `${customization.value.bubblesize || 64}px`)
  root.style.setProperty('--popup-width', `${customization.value.popupwidth || 400}px`)
  root.style.setProperty('--popup-height', `${customization.value.bubblewidth || 600}px`)
  root.style.setProperty('--border-radius', `${customization.value.borderraduis || 16}px`)

  const wrapper = document.querySelector('.cdUser011011-wrapper')
  if (wrapper) {
    wrapper.classList.remove(
      'position-bottom-right',
      'position-bottom-left',
      'position-top-right',
      'position-top-left',
    )
    wrapper.classList.add(`position-${customization.value.position || 'bottom-right'}`)
  }
}

const applyDefaultStyles = () => {
  const root = document.documentElement
  root.style.setProperty('--primary-color', '#10b981')
  root.style.setProperty('--secondary-color', '#059669')
  root.style.setProperty('--bubble-size', '64px')
  root.style.setProperty('--popup-width', '400px')
  root.style.setProperty('--popup-height', '600px')
  root.style.setProperty('--border-radius', '16px')
}

const showAvatar = computed(() => {
  return customization.value?.showavartar !== false
})

const avatarUrl = computed(() => {
  return customization.value?.avartar || 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png'
})

const handleSessionExpired = () => {
  // Session expired in admin chat
  console.log('⏰ Session expired, resetting to bot chat')

  // Clear everything and reset
  SessionManager.clearAllUserData(userId.value)

  // Reset to initial state
  showUserBotChat.value = true
  showChat.value = false
  messages.value = [
    { text: "Hey there, I'm Chatbot convo. How can I help you today?", sender: 'AI' },
  ]
}

const loadBotMessages = () => {
  const storedMessages = localStorage.getItem(`messages_${userId.value}`)

  if (storedMessages) {
    try {
      const data = JSON.parse(storedMessages)

      // Validate timestamp
      if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        messages.value = data.messages || getDefaultMessage()
      } else {
        messages.value = getDefaultMessage()
      }
    } catch {
      messages.value = getDefaultMessage()
    }
  } else {
    messages.value = getDefaultMessage()
  }
}

const getDefaultMessage = () => {
  return [{ text: "Hey there, I'm Chatbot convo. How can I help you today?", sender: 'AI' }]
}

onMounted(() => {
  // 1. Clear any expired sessions first
  SessionManager.clearExpiredSessions()

  // 2. Initialize session and get userId
  const { userId: sessionUserId, hasValidSession } = SessionManager.initSession(props.website)
  userId.value = sessionUserId
  showChat.value = hasValidSession

  console.log('🚀 Initialized:', { userId: userId.value, hasValidSession })

  // 3. Check if admin mode is active
  showUserBotChat.value = !SessionManager.isAdminModeActive()

  // 4. Load bot messages if in bot chat mode
  if (showUserBotChat.value && hasValidSession) {
    loadBotMessages()
  }

  // 5. Show bubble after delay
  setTimeout(() => {
    showBubble.value = true
  }, 3000)

  // 6. Fetch customization
  getCustomization()
})

// Clean up timers
onBeforeUnmount(() => {
  Object.values(charTimers).forEach((t) => clearTimeout(t))
})
</script>

<template>
  <div class="cdUser011011-wrapper position-bottom-right" v-if="showBubble">
    <div class="cdUser011011-chatbot">
      <div class="cdUser011011-inner">
        <div class="cdUser011011-bubble" @click="togglePopup">
          <svg xmlns="http://www.w3.org/2000/svg" class="cdUser011011-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M2 22V9q0-.825.588-1.413Q3.175 7 4 7h2V4q0-.825.588-1.413Q7.175 2 8 2h12q.825 0 1.413.587Q22 3.175 22 4v8q0 .825-.587 1.412Q20.825 14 20 14h-2v3q0 .825-.587 1.413Q16.825 19 16 19H5Zm6-10h8V9H8Zm-4 5h12v-3H8q-.825 0-1.412-.588Q6 12.825 6 12V9H4Zm14-5h2V4H8v3h8q.825 0 1.413.587Q18 8.175 18 9Z"
            />
          </svg>
          <span v-if="hasUnreadMessages" class="cdUser011011-ping"></span>
          <span v-if="hasUnreadMessages" class="cdUser011011-ping-static"></span>
        </div>

        <transition name="cdUser011011-fade">
          <div v-if="showPopup" class="cdUser011011-popup-container">
            <div class="cdUser011011-popup">
              <header class="cdUser011011-header">
                <div class="cdUser011011-header-left">
                  <div v-if="showAvatar" class="cdUser011011-avatar">
                    <img :src="avatarUrl" class="cdUser011011-avatar-img" />
                  </div>
                  <div v-else class="cdUser011011-avatar">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M1 18q.225-2.675 1.638-4.925T6.4 9.5L4.55 6.3q-.15-.225-.075-.475T4.8 5.45q.2-.125.45-.05t.4.3L7.5 8.9Q9.65 8 12 8t4.5.9l1.85-3.2q.15-.225.4-.3t.45.05q.25.125.325.375t-.075.475L17.6 9.5q2.35 1.325 3.762 3.575T23 18zm6-2.75q.525 0 .888-.363T8.25 14t-.363-.888T7 12.75t-.888.363T5.75 14t.363.888t.887.362m10 0q.525 0 .888-.363T18.25 14t-.363-.888T17 12.75t-.888.363t-.362.887t.363.888t.887.362"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 class="cdUser011011-title">Help Desk</h2>
                    <p class="cdUser011011-subtitle">Your support assistant, ready to help</p>
                  </div>
                </div>
                <button class="cdUser011011-close" @click="togglePopup">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"
                    />
                  </svg>
                </button>
              </header>

              <SignInForm
                v-if="!showChat"
                @form-complete="handleFormComplete"
                :primary-color="customization?.primarycolor"
              />

              <section v-else ref="chatContainer" class="cdUser011011-body">
                <div v-if="showUserBotChat" class="cdUser011011-messages-container">
                  <div
                    v-for="(msg, index) in messages"
                    :key="index"
                    class="cdUser011011-message-row"
                    :class="
                      msg.sender === 'AI'
                        ? 'cdUser011011-message-left'
                        : 'cdUser011011-message-right'
                    "
                  >
                    <template v-if="msg.sender === 'AI'">
                      <div v-if="showAvatar" class="cdUser011011-avatar-bot">
                        <img :src="avatarUrl" class="cdUser011011-avatar-img" />
                      </div>
                      <div v-else class="cdUser011011-avatar-bot">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="currentColor"
                            d="M1 18q.225-2.675 1.638-4.925T6.4 9.5L4.55 6.3q-.15-.225-.075-.475T4.8 5.45q.2-.125.45-.05t.4.3L7.5 8.9Q9.65 8 12 8t4.5.9l1.85-3.2q.15-.225.4-.3t.45.05q.25.125.325.375t-.075.475L17.6 9.5q2.35 1.325 3.762 3.575T23 18zm6-2.75q.525 0 .888-.363T8.25 14t-.363-.888T7 12.75t-.888.363T5.75 14t.363.888t.887.362m10 0q.525 0 .888-.363T18.25 14t-.363-.888T17 12.75t-.888.363t-.362.887t.363.888t.887.362"
                          />
                        </svg>
                      </div>

                      <div v-if="!msg.isButton" class="cdUser011011-message bot">
                        <span v-if="msg.isThinking" class="cdUser011011-typing-indicator">
                          <span class="cdUser011011-typing-dot"></span>
                          <span class="cdUser011011-typing-dot"></span>
                          <span class="cdUser011011-typing-dot"></span>
                        </span>
                        <span
                          v-else-if="typingMessageIndex === index"
                          class="cdUser011011-chat-message"
                          v-html="formatMessage(displayedTexts[index] || '')"
                        >
                        </span>
                        <span
                          v-else
                          class="cdUser011011-chat-message"
                          v-html="formatMessage(msg.text)"
                        >
                        </span>
                      </div>

                      <div v-else class="cdUser011011-message bot">
                        <button
                          class="cdUser011011-fallback-btn"
                          @click="sendToAdmin(msg.triggeringMessage)"
                        >
                          Chat with a representative
                        </button>
                      </div>
                    </template>

                    <template v-else>
                      <div class="cdUser011011-message user">{{ msg.text }}</div>
                      <div class="cdUser011011-avatar-user">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="currentColor"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3s-3-1.34-3-3s1.34-3 3-3m0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08c1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22"
                          />
                        </svg>
                      </div>
                    </template>
                  </div>
                </div>

                <AdminChatSection
                  v-else
                  :userId="userId"
                  :api="props.api"
                  :website="props.website"
                  :primary-color="customization?.primarycolor"
                  :secondary-color="customization?.secondarycolor"
                  @session-expired="handleSessionExpired"
                />
              </section>

              <footer class="cdUser011011-footer">
                <div class="cdUser011011-footer-main" v-if="showUserBotChat">
                  <div class="cdUser011011-input-wrapper">
                    <input
                      v-model="userInput"
                      @keyup.enter="sendMessage"
                      type="text"
                      placeholder="Type your message..."
                      class="cdUser011011-footer-input"
                    />
                    <button
                      class="cdUser011011-footer-send"
                      @click="sendMessage"
                      :disabled="!userInput.trim()"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                      >
                        <path fill="currentColor" d="M3 20v-6l8-2l-8-2V4l19 8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </footer>
            </div>
            <div v-if="showPopup" class="cdUser011011-watermark">
              <a
                href="https://chatbotconvo.com"
                target="_blank"
                class="cdUser011011-watermark-link"
                @click.stop
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Powered by</span>
                <strong>chatbotconvo.com</strong>
              </a>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<!-- Keep all your existing styles -->

<style>
:root {
  --primary-color: #10b981;
  --secondary-color: #059669;
  --bubble-size: 64px;
  --popup-width: 400px;
  --popup-height: 600px;
  --border-radius: 16px;
}
.cdUser011011-popup-container {
  position: absolute;
  bottom: 50px;
  right: 0;
  display: flex;
  flex-direction: column;
}
.cdUser011011-watermark {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 12px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  margin-top: 4px;
  border-radius: 0 0 12px 12px;
  box-sizing: border-box;
}

.cdUser011011-watermark-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 0.2px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.cdUser011011-watermark-link:hover {
  opacity: 1;
  color: var(--primary-color);
}

.cdUser011011-watermark-link span {
  font-weight: 400;
  color: #9ca3af;
}

.cdUser011011-watermark-link strong {
  font-weight: 600;
  color: #4b5563;
}

.cdUser011011-wrapper {
  z-index: 9999;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.cdUser011011-wrapper *,
.cdUser011011-wrapper *::before,
.cdUser011011-wrapper *::after {
  box-sizing: border-box;
  margin: 0;
  /* padding: 0; */
}
.cdUser011011-wrapper.position-bottom-right {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
}

.cdUser011011-wrapper.position-bottom-left {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
}

.cdUser011011-wrapper.position-top-right {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
}

.cdUser011011-wrapper.position-top-left {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
}

/* === Floating Bubble === */
.cdUser011011-bubble {
  width: var(--bubble-size);
  height: var(--bubble-size);
  background: var(--primary-color);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 8px 24px rgba(16, 185, 129, 0.2);
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cdUser011011-bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  margin: 0;
  padding: 0;
}

.cdUser011011-bubble:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow:
    0 6px 16px rgba(16, 185, 129, 0.4),
    0 12px 32px rgba(16, 185, 129, 0.25);
}

.cdUser011011-bubble:active {
  transform: scale(0.95);
}

.cdUser011011-icon {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  display: block;
}

/* Ping Animation */
.cdUser011011-ping,
.cdUser011011-ping-static {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  background: #34d399;
  border-radius: 50%;
  border: 2px solid #fff;
  margin: 0;
  padding: 0;
}

.cdUser011011-ping {
  animation: cdUser011011-pingAnim 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.cdUser011011-ping-static {
  box-shadow: 0 0 4px var(--secondary-color);
}

@keyframes cdUser011011-pingAnim {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  75%,
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes cdUser011011-bounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* === Chat Popup === */
.cdUser011011-popup {
  width: var(--popup-width);
  height: var(--popup-height);
  background: #ffffff;
  border-radius: var(--border-radius);
  box-shadow:
    0 2px 6px 0 rgba(0, 0, 0, 0.2),
    0 4px 18px 0 rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  /* margin-bottom: 0; */
  padding: 0;
}

/* === Header === */
.cdUser011011-header {
  background: var(--primary-color);
  color: #fff;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.cdUser011011-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.cdUser011011-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}
.cdUser011011-avatar-img {
  width: 20px;
  height: 20px;
}

.cdUser011011-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  padding: 0;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin-right: 100px;
}

.cdUser011011-title-highlight {
  color: #d1fae5;
  font-weight: 800;
}

.cdUser011011-subtitle {
  font-size: 0.75rem;
  margin: 2px 0 0 0;
  padding: 0;
  opacity: 0.9;
  font-weight: 400;
  line-height: 1.2;
  color: white;
}

.cdUser011011-close {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.cdUser011011-close:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(90deg);
}

/* === Body / Messages === */
.cdUser011011-body {
  background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem 1rem;
  scroll-behavior: smooth;
  margin: 0;
  min-height: 0; /* Important for flex children */
}

.cdUser011011-body::-webkit-scrollbar {
  width: 6px;
}

.cdUser011011-body::-webkit-scrollbar-track {
  background: transparent;
}

.cdUser011011-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

.cdUser011011-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.cdUser011011-messages-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
}

.cdUser011011-message-row {
  display: flex;
  align-items: flex-end;
  animation: cdUser011011-messageSlide 0.3s ease;
  margin: 0;
  padding: 0;
}

@keyframes cdUser011011-messageSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cdUser011011-message-left {
  justify-content: flex-start;
}

.cdUser011011-message-right {
  justify-content: flex-end;
}

/* === Avatars === */
.cdUser011011-avatar-bot,
.cdUser011011-avatar-user {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  padding: 0;
}

.cdUser011011-avatar-bot {
  background: var(--primary-color);
  color: #fff;
  margin: 0 10px 0 0;
}

.cdUser011011-avatar-user {
  background: color-mix(in srgb, var(--secondary-color) 12.5%, transparent);
  margin: 0 0 0 10px;
}

/* === Message Bubbles === */
.cdUser011011-message {
  padding: 0.875rem 1.125rem;
  border-radius: 16px;
  font-size: 0.9375rem;
  line-height: 1.5;
  max-width: 75%;
  word-wrap: break-word;
  word-break: break-word;
  position: relative;
  animation: cdUser011011-messagePop 0.2s ease;
  margin: 0;
}

@keyframes cdUser011011-messagePop {
  0% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

.cdUser011011-message.bot {
  /* background: var(--secondary-color); Fallback */
  background: color-mix(in srgb, var(--secondary-color) 12.5%, transparent);
  color: #333;
  border-bottom-left-radius: 4px;
}

.cdUser011011-message.user {
  background: var(--primary-color);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

/* .cdUser011011-wrapper.position-bottom-right {
  bottom: 1.5rem;
  right: 1.5rem;
}

.cdUser011011-wrapper.position-bottom-left {
  bottom: 1.5rem;
  left: 1.5rem;
}

.cdUser011011-wrapper.position-top-right {
  top: 1.5rem;
  right: 1.5rem;
}

.cdUser011011-wrapper.position-top-left {
  top: 1.5rem;
  left: 1.5rem;
} */
/* === Typing Indicator === */
.cdUser011011-typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  margin: 0;
  color: var(--primary-color);
}

.cdUser011011-typing-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: cdUser011011-typingBounce 1.4s infinite ease-in-out both;
  margin: 0;
  padding: 0;
}

.cdUser011011-typing-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.cdUser011011-typing-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes cdUser011011-typingBounce {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* === Empty State === */
.cdUser011011-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 1rem;
  margin: 0;
}

.cdUser011011-empty-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  margin: 0;
  padding: 0;
}

.cdUser011011-empty-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  padding: 0;
  line-height: 1.4;
}

.cdUser011011-empty-subtext {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
  padding: 0;
  line-height: 1.4;
}

/* === Footer === */
.cdUser011011-footer {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.cdUser011011-footer-main {
  padding: 0.75rem;
  margin: 0;
}

.cdUser011011-input-wrapper {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
}

.cdUser011011-footer-input {
  width: 100%;
  padding: 0.875rem 3.5rem 0.875rem 1rem;
  border-radius: 12px;
  border: 1.5px solid var(--primary-color);
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
  background: #f9fafb;
  font-family: inherit;
  margin: 0;
  line-height: 1.5;
}

.cdUser011011-footer-input:focus {
  border-color: var(--primary-color);
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(16, 185, 129, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.05);
}

.cdUser011011-footer-input::placeholder {
  color: #9ca3af;
}

.cdUser011011-footer-send {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.cdUser011011-footer-send:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.cdUser011011-footer-send:disabled {
  background: #e2e8f0;
  color: #a0aec0;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.6;
}

.cdUser011011-footer-send:active {
  transform: translateY(-50%) scale(0.95);
}

.cdUser011011-fallback-btn {
  background: white;
  color: #000;
  border: none;
  border-radius: 20px;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 0.9rem;
  margin: 6px 0 0 0;
  font-weight: 500;
  transition: all 0.3s ease;
  display: inline-block;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
}

.cdUser011011-fallback-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
  background: #fff;
}

/* === Toggle Buttons === */
.cdUser011011-toggle-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-top: 1px solid #e5e7eb;
  margin: 0;
}

.cdUser011011-toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.2s ease;
  font-family: inherit;
  margin: 0;
  line-height: 1.2;
}

.cdUser011011-toggle-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.cdUser011011-toggle-btn.cdUser011011-active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: #ffffff;
  box-shadow:
    0 2px 8px rgba(16, 185, 129, 0.25),
    0 1px 3px rgba(16, 185, 129, 0.15);
}

.cdUser011011-toggle-btn.cdUser011011-active:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 2px 6px rgba(16, 185, 129, 0.2);
}

.cdUser011011-toggle-btn svg {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

/* === Transitions === */
.cdUser011011-fade-enter-active {
  animation: cdUser011011-popupSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cdUser011011-fade-leave-active {
  animation: cdUser011011-popupSlideOut 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes cdUser011011-popupSlideIn {
  from {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes cdUser011011-popupSlideOut {
  from {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
}

/* === Responsive Design === */
@media (max-width: 480px) {
  .cdUser011011-wrapper {
    bottom: 1rem;
    right: 1rem;
  }

  .cdUser011011-popup {
    width: calc(100vw - 2rem);
    height: calc(100vh - 120px);
    max-width: 400px;
    max-height: 600px;
  }

  .cdUser011011-bubble {
    width: 56px;
    height: 56px;
  }

  .cdUser011011-icon {
    width: 26px;
    height: 26px;
  }
}

@media (max-height: 700px) {
  .cdUser011011-popup {
    height: 500px;
  }
}

/* chat formatter from AI response */
.cdUser011011-chat-message {
  line-height: 1.6;
  font-size: 15px;
  color: #333;
}
.cdUser011011-chat-message h1,
h2,
h3 {
  margin: 12px 0 6px;
  line-height: 1.3;
}
.cdUser011011-chat-message h1 {
  font-size: 20px;
  font-weight: 700;
}

.cdUser011011-chat-message h2 {
  font-size: 18px;
  font-weight: 600;
}

.cdUser011011-chat-message h3 {
  font-size: 16px;
  font-weight: 600;
}
.cdUser011011-chat-message p {
  margin: 8px 0;
}

.cdUser011011-chat-message strong,
.cdUser011011-chat-message b {
  font-weight: 600;
}

.cdUser011011-chat-message em,
.cdUser011011-chat-message i {
  font-style: italic;
}

.cdUser011011-chat-message ul,
.cdUser011011-chat-message ol {
  padding-left: 20px;
  margin: 8px 0;
}

.cdUser011011-chat-message li {
  margin: 4px 0;
}

.cdUser011011-chat-message a {
  color: #2563eb;
  text-decoration: underline;
  font-weight: 500;
}

.cdUser011011-chat-message a:hover {
  text-decoration: none;
}
</style>
