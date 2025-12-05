<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import axios from 'axios'
import getUserId from './utils/userId'
import { useAbly } from '../composables/userAbly'
import { useChatNotifications } from '../composables/useChatNotifications'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const { setUnreadMessage } = useChatNotifications()

const sending = ref(false)
const loading = ref(false)
const chatMessages = ref([])
const newMessage = ref('')
const isAdminTyping = ref(false)
let typingUnsubscribe = null
let inputTypingTimeout = null

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

const sessionId = getUserId(cleanWebsite)

// Initialize Ably Composables
const {
  initializeAbly,
  onAdminReply,
  isConnected,
  sendTypingIndicator,
  onAdminTyping,
  disconnect: disconnectAbly,
} = useAbly()

let unsubscribeFromAbly = () => {} // To hold the unsubscribe function

const statusText = computed(() => {
  if (!isConnected.value) return 'Connecting...'
  return 'Online'
})

const saveMessages = () => {
  if (!props.userId) return
  const payload = {
    timestamp: Date.now(),
    chatMessages: chatMessages.value,
  }
  localStorage.setItem(`chatMessages_${props.userId}`, JSON.stringify(payload))
}

const fetchInitialMessages = async () => {
  if (!cleanWebsite) return
  try {
    loading.value = true
    const url = `https://assitance.storehive.com.ng/public/api/chat/admin/session/${sessionId}`
    const response = await axios.get(url, {
      params: { website: props.website },
    })

    chatMessages.value = (response.data.data?.messages || []).map((msg) => {
      const senderType = msg.sender_type === 'user' ? 'user' : 'admin'
      return {
        ...msg,
        sender: senderType,
      }
    })

    saveMessages()
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Failed to fetch session messages:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchInitialMessages()
})

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = ''

  if (inputTypingTimeout) clearTimeout(inputTypingTimeout)
  sendTypingIndicator(sessionId, false)

  try {
    sending.value = true

    const userMessage = {
      message: messageToSend,
      sender: 'user',
      sender_type: 'user',
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random(),
    }

    chatMessages.value.push(userMessage)
    saveMessages()
    await nextTick()
    scrollToBottom()

    await axios.post('https://assitance.storehive.com.ng/public/api/chat/admin/message', {
      session_id: sessionId,
      message: messageToSend,
      website: props.website,
      sender_type: 'user',
    })
  } catch (err) {
    console.error('Message send failed:', err)
    newMessage.value = messageToSend
  } finally {
    sending.value = false
  }
}

const chatContainerRef = ref(null)
const scrollToBottom = () => {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTo({
      top: chatContainerRef.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getMessageAlignment = (msg) => {
  return msg.sender === 'user' || msg.sender_type === 'user' ? 'user' : 'admin'
}

const handleAdminReply = async (messageData) => {
  const adminMessage = {
    message: messageData.message,
    sender: 'admin',
    sender_type: 'admin',
    timestamp: messageData.timestamp || new Date().toISOString(),
    id: messageData.id || Date.now() + Math.random(),
  }

  chatMessages.value.push(adminMessage)
  saveMessages()
  await nextTick()
  scrollToBottom()

  setUnreadMessage(true)
}

const handleInputChange = () => {
  sendTypingIndicator(sessionId, true)

  if (inputTypingTimeout) clearTimeout(inputTypingTimeout)

  inputTypingTimeout = setTimeout(() => {
    sendTypingIndicator(sessionId, false)
  }, 1000)
}

onMounted(async () => {
  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 1 * 24 * 60 * 60 * 1000

  if (stored) {
    const data = JSON.parse(stored)
    if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
      localStorage.removeItem(`chatMessages_${props.userId}`)
      await fetchInitialMessages()
    } else {
      chatMessages.value = data.chatMessages
      await nextTick()
      scrollToBottom()
      setTimeout(() => {
        fetchInitialMessages()
      }, 1000)
    }
  } else {
    await fetchInitialMessages()
    await nextTick()
    scrollToBottom()
  }

  // Initialize Ably
  const isAblyInitialized = await initializeAbly()
  if (isAblyInitialized) {
    unsubscribeFromAbly = onAdminReply(sessionId, handleAdminReply)

    typingUnsubscribe = onAdminTyping(sessionId, (isTyping) => {
      isAdminTyping.value = isTyping
      if (isTyping) {
        nextTick(() => scrollToBottom())
      }
    })
  }
})

onBeforeUnmount(() => {
  unsubscribeFromAbly()
  disconnectAbly()
  if (typingUnsubscribe) typingUnsubscribe()
  if (inputTypingTimeout) clearTimeout(inputTypingTimeout)
})
</script>

<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-left">
        <div class="status-dot" :class="{ active: isConnected }"></div>
        <span class="header-title">Admin Chat</span>
      </div>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <div class="messages-wrapper">
      <div ref="chatContainerRef" class="messages-container">
        <template v-for="(msg, i) in chatMessages" :key="msg.id || i">
          <div
            v-if="
              i === 0 ||
              new Date(msg.timestamp).toDateString() !==
                new Date(chatMessages[i - 1].timestamp).toDateString()
            "
            class="date-divider"
          >
            {{
              new Date(msg.timestamp).toDateString() === new Date().toDateString()
                ? 'Today'
                : new Date(msg.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })
            }}
          </div>

          <div class="message-row" :class="getMessageAlignment(msg)">
            <div class="message-bubble" :class="getMessageAlignment(msg)">
              <p>{{ msg.message }}</p>
              <span class="time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>

          <div v-if="isAdminTyping" class="message-row admin">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </template>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading messages...</p>
        </div>

        <div v-if="chatMessages.length === 0 && !loading" class="empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p>No messages yet</p>
          <span>Start the conversation</span>
        </div>
      </div>
    </div>

    <div class="input-wrapper">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        @input="handleInputChange"
        type="text"
        placeholder="Type a message..."
        :disabled="sending || !isConnected"
        class="message-input"
      />
      <button
        @click="sendMessage"
        class="send-btn"
        :disabled="!newMessage.trim() || sending || !isConnected"
      >
        <svg
          v-if="!sending"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <div v-else class="btn-loader"></div>
      </button>
    </div>
  </div>
</template>

<template>
  <div class="cdUser011011-wrapper position-bottom-right" v-if="showBubble">
    <div class="cdUser011011-chatbot">
      <div class="cdUser011011-inner">
        <!-- Bubble button -->
        <div class="cdUser011011-bubble" @click="togglePopup">
          <!-- SVG content -->
        </div>

        <transition name="cdUser011011-fade">
          <!-- Wrap both popup and watermark in a container -->
          <div v-if="showPopup" class="cdUser011011-popup-container">
            <div class="cdUser011011-popup">
              <!-- Your popup content (header, body, footer) -->
              <header class="cdUser011011-header">
                <!-- ... -->
              </header>

              <section class="cdUser011011-body">
                <!-- ... -->
              </section>

              <footer class="cdUser011011-footer">
                <!-- ... -->
              </footer>
            </div>

            <!-- Watermark now positioned relative to the container -->
            <div class="cdUser011011-watermark">
              <a
                href="https://chatbotconvo.com"
                target="_blank"
                class="cdUser011011-watermark-link"
              >
                <!-- SVG and text -->
              </a>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<template>
  <div class="child-component" :style="customStyles">
    <div class="styled-element">I'm styled with CSS variables!</div>
    <button class="styled-button">Click me</button>
  </div>

  <div v-if="showPopup" class="cdUser011011-popup-container">
    <!-- ADD THIS DIV ↓ -->
    <div class="cdUser011011-popup">
      <header class="cdUser011011-header">...</header>

      <SignInForm v-if="!showChat" />

      <section v-else ref="chatContainer" class="cdUser011011-body">...</section>

      <footer class="cdUser011011-footer">...</footer>
    </div>
    <!-- ADD THIS DIV ↑ -->

    <div v-if="showPopup" class="cdUser011011-watermark">...</div>
  </div>
</template>

.cdUser011011-popup-container { position: absolute; bottom: 50px; right: 0; display: flex;
flex-direction: column; } .cdUser011011-watermark { display: flex; justify-content: center;
align-items: center; padding: 6px 12px; border-top: 1px solid #e5e7eb; flex-shrink: 0; margin-top:
4px; border-radius: 0 0 12px 12px; width: var(--popup-width); box-sizing: border-box; }

<script setup>
import { computed } from 'vue'

const props = defineProps({
  primaryColor: {
    type: String,
    default: '#10b981',
  },
  secondaryColor: {
    type: String,
    default: '#059669',
  },
})

// Create style object with CSS variables
const customStyles = computed(() => ({
  '--primary-color': props.primaryColor,
  '--secondary-color': props.secondaryColor,
}))
</script>

<style scoped>
/* Container for popup + watermark */
.cdUser011011-popup-container {
  position: absolute;
  bottom: 84px; /* Same as your popup's bottom position */
  right: 0;
  display: flex;
  flex-direction: column;
}

.cdUser011011-popup {
  width: var(--popup-width);
  height: var(--popup-height);
  background: #ffffff;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 0; /* Remove bottom margin since watermark will handle spacing */
}

.cdUser011011-popup {
  /* DELETE THESE 3 LINES: */
  position: absolute;
  bottom: 84px;
  right: 0;

  /* KEEP EVERYTHING ELSE: */
  width: var(--popup-width);
  height: var(--popup-height);
  background: #ffffff;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  padding: 0;
}

.cdUser011011-watermark {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 12px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  /* Position it below the popup */
  margin-top: 4px;
  border-radius: 0 0 12px 12px;
  /* Match popup width */
  width: var(--popup-width);
  box-sizing: border-box;
}

/* Keep your existing watermark-link styles */
.cdUser011011-watermark-link {
  /* Your existing styles */
}
/* Now you can use the CSS variables */
.styled-element {
  background: var(--primary-color);
  color: white;
  padding: 10px;
  border-radius: 8px;
}

.styled-button {
  background: var(--secondary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.styled-button:hover {
  background: var(--primary-color);
  transition: background 0.3s;
}
</style>

<script setup>
import ChildComponent from './ChildComponent.vue'
</script>

<style scoped>
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Clean Simple Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all 0.3s ease;
}

.status-dot.active {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.status-text {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

/* Messages Area */
.messages-wrapper {
  flex: 1;
  overflow: hidden;
  background: #fafafa;
  min-height: 0;
}

.messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* Date Divider */
.date-divider {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0;
}

/* Message Row */
.message-row {
  display: flex;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-row.admin {
  justify-content: flex-start;
}

.message-row.user {
  justify-content: flex-end;
}

/* Message Bubble */
.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-bubble.admin {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}

.message-bubble.user {
  background: #009970;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.message-bubble p {
  margin: 0 0 4px 0;
  white-space: pre-wrap;
}

.message-bubble .time {
  font-size: 10px;
  opacity: 0.6;
  display: block;
  margin-top: 2px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #9ca3af;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #e5e7eb;
  border-top-color: #009970;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin: 0;
  font-size: 13px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #6b7280;
}

.empty-state span {
  font-size: 13px;
  color: #9ca3af;
}

/* Input Area */
.input-wrapper {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: #fafafa;
}

.message-input:focus {
  border-color: #009970;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 153, 112, 0.08);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-input::placeholder {
  color: #9ca3af;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: #009970;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #00805d;
  transform: scale(1.05);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-loader {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Responsive Design */
@media (max-width: 640px) {
  .chat-header {
    padding: 14px 16px;
  }

  .messages-container {
    padding: 16px;
  }

  .message-bubble {
    max-width: 80%;
  }

  .input-wrapper {
    padding: 12px 16px;
  }

  .message-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
</style>
