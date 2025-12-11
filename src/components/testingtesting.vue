<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import axios from 'axios'
// import { getUserId } from './utils/userId'
import { useAbly } from '../composables/userAbly'
import { useChatNotifications } from '../composables/useChatNotifications'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
  primaryColor: { type: String, required: true },
  secondaryColor: { type: String, required: true },
})

const customStyles = computed(() => ({
  '--primary-color': props.primaryColor,
  '--secondary-color': props.secondaryColor,
}))

console.log('userId prop:', props.userId)

const { setUnreadMessage } = useChatNotifications()

const sending = ref(false)
const loading = ref(false)
const chatMessages = ref([])
const newMessage = ref('')
const isAdminTyping = ref(false)
let typingUnsubscribe = null
let inputTypingTimeout = null

// const cleanWebsite = props.website
//   .replace(/^https?:\/\//, '')
//   .replace(/^www\./, '')
//   .split('/')[0]

// const props.userId = getUserId(cleanWebsite)

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
  if (!props.website) return
  try {
    loading.value = true
    const url = `https://assitance.storehive.com.ng/public/api/chat/admin/session/${props.userId}`
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
  sendTypingIndicator(props.userId, false)

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
      session_id: props.userId,
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
  sendTypingIndicator(props.userId, true)

  if (inputTypingTimeout) clearTimeout(inputTypingTimeout)

  inputTypingTimeout = setTimeout(() => {
    sendTypingIndicator(props.userId, false)
  }, 1000)
}

onMounted(async () => {
  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 1 * 24 * 60 * 60 * 1000

  if (stored) {
    const data = JSON.parse(stored)
    if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
      localStorage.removeItem(`chatMessages_${props.userId}`)
      localStorage.removeItem('adminMode')

      // window.location.reload()
      await fetchInitialMessages()
      emit('session-expired')
      return
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
    unsubscribeFromAbly = onAdminReply(props.userId, handleAdminReply)

    typingUnsubscribe = onAdminTyping(props.userId, (isTyping) => {
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
  <div class="cdUser011011-chat-container">
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-left">
        <div
          class="cdUser011011-status-dot"
          :class="{ active: isConnected }"
          :style="customStyles"
        ></div>
        <span class="cdUser011011-header-title">Admin Chat</span>
      </div>
      <span class="cdUser011011-status-text">{{ statusText }}</span>
    </div>

    <div class="cdUser011011-messages-wrapper">
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
        <template v-for="(msg, i) in chatMessages" :key="msg.id || i">
          <div
            v-if="
              i === 0 ||
              new Date(msg.timestamp).toDateString() !==
                new Date(chatMessages[i - 1].timestamp).toDateString()
            "
            class="cdUser011011-date-divider"
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

          <div class="cdUser011011-message-row" :class="getMessageAlignment(msg)">
            <div
              class="cdUser011011-message-bubble"
              :class="getMessageAlignment(msg)"
              :style="customStyles"
            >
              <p>{{ msg.message }}</p>
              <span class="cdUser011011-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>

          <div v-if="isAdminTyping" class="cdUser011011-message-row admin">
            <div class="cdUser011011-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </template>

        <div v-if="loading" class="cdUser011011-loading-state">
          <div class="cdUser011011-spinner" :style="customStyles"></div>
          <p>Loading messages...</p>
        </div>

        <div v-if="chatMessages.length === 0 && !loading" class="cdUser011011-empty-state">
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

    <div class="cdUser011011-input-wrapper">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        @input="handleInputChange"
        type="text"
        placeholder="Type a message..."
        :disabled="sending || !isConnected"
        class="cdUser011011-message-input"
        :style="customStyles"
      />
      <button
        @click="sendMessage"
        class="cdUser011011-send-btn"
        :disabled="!newMessage.trim() || sending || !isConnected"
        :style="customStyles"
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

<style scoped>
.cdUser011011-typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
}

.cdUser011011-typing-indicator span {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.cdUser011011-typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.cdUser011011-typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.cdUser011011-typing-indicator span:nth-child(3) {
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

.cdUser011011-chat-container {
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
.cdUser011011-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.cdUser011011-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cdUser011011-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all 0.3s ease;
}

.cdUser011011-status-dot.active {
  background: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.cdUser011011-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.cdUser011011-status-text {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

/* Messages Area */
.cdUser011011-messages-wrapper {
  flex: 1;
  overflow: hidden;
  background: #fafafa;
  min-height: 0;
}

.cdUser011011-messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cdUser011011-messages-container::-webkit-scrollbar {
  width: 6px;
}

.cdUser011011-messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.cdUser011011-messages-container::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

.cdUser011011-messages-container::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* Date Divider */
.cdUser011011-date-divider {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0;
}

/* Message Row */
.cdUser011011-message-row {
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

.cdUser011011-message-row.admin {
  justify-content: flex-start;
}

.cdUser011011-message-row.user {
  justify-content: flex-end;
}

/* Message Bubble */
.cdUser011011-message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.cdUser011011-message-bubble.admin {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}

.cdUser011011-message-bubble.user {
  background: var(--primary-color);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.cdUser011011-message-bubble p {
  margin: 0 0 4px 0;
  white-space: pre-wrap;
}

.cdUser011011-message-bubble .time {
  font-size: 10px;
  opacity: 0.6;
  display: block;
  margin-top: 2px;
}

/* Loading State */
.cdUser011011-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #9ca3af;
}

.cdUser011011-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #e5e7eb;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.cdUser011011-loading-state p {
  margin: 0;
  font-size: 13px;
}

/* Empty State */
.cdUser011011-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.cdUser011011-empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.cdUser011011-empty-state p {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #6b7280;
}

.cdUser011011-empty-state span {
  font-size: 13px;
  color: #9ca3af;
}

/* Input Area */
.cdUser011011-input-wrapper {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.cdUser011011-message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: #fafafa;
}

.cdUser0110110-message-input:focus {
  border-color: var(--primary-color);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 153, 112, 0.08);
}

.cdUser011011-message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cdUser011011-message-input::placeholder {
  color: #9ca3af;
}

.cdUser011011-send-btn {
  width: 44px;
  height: 44px;
  background: var(--primary-color);
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

.cdUser011011-send-btn:hover:not(:disabled) {
  background: var(--primary-color);
  transform: scale(1.05);
}

.cdUser011011-send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.cdUser011011-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.cdUser011011-btn-loader {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Responsive Design */
@media (max-width: 640px) {
  .cdUser011011-chat-header {
    padding: 14px 16px;
  }

  .cdUser011011-messages-container {
    padding: 16px;
  }

  .cdUser011011-message-bubble {
    max-width: 80%;
  }

  .cdUser011011-input-wrapper {
    padding: 12px 16px;
  }

  .cdUser011011-message-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
</style>

<template>
  <div class="cdUser011011-chat-container">
    <!-- Header -->
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-left">
        <div
          class="cdUser011011-status-dot"
          :class="{ active: isConnected }"
          :style="customStyles"
        ></div>
        <div class="cdUser011011-header-info">
          <span class="cdUser011011-header-title">Admin Chat</span>
          <span class="cdUser011011-status-text">{{ statusText }}</span>
        </div>
      </div>
      <button
        @click="scrollToBottom"
        class="cdUser011011-scroll-btn"
        v-if="showScrollButton"
        title="Scroll to bottom"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>
    </div>

    <!-- Messages Area -->
    <div class="cdUser011011-messages-wrapper">
      <div ref="chatContainerRef" class="cdUser011011-messages-container" @scroll="handleScroll">
        <!-- Loading indicator at top for infinite scroll -->
        <div v-if="loadingMore" class="cdUser011011-loading-more">
          <div class="cdUser011011-mini-spinner"></div>
          <span>Loading more messages...</span>
        </div>

        <!-- Messages -->
        <template v-for="(msg, i) in chatMessages" :key="msg.id || i">
          <!-- Date divider -->
          <div
            v-if="
              i === 0 ||
              new Date(msg.timestamp).toDateString() !==
                new Date(chatMessages[i - 1].timestamp).toDateString()
            "
            class="cdUser011011-date-divider"
          >
            <span class="cdUser011011-date-text">
              {{
                new Date(msg.timestamp).toDateString() === new Date().toDateString()
                  ? 'Today'
                  : new Date(msg.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year:
                        new Date(msg.timestamp).getFullYear() !== new Date().getFullYear()
                          ? 'numeric'
                          : undefined,
                    })
              }}
            </span>
          </div>

          <!-- Message bubble -->
          <div class="cdUser011011-message-row" :class="getMessageAlignment(msg)">
            <div
              class="cdUser011011-message-bubble"
              :class="getMessageAlignment(msg)"
              :style="getBubbleStyle(msg)"
            >
              <p class="cdUser011011-message-text">{{ msg.message }}</p>
              <span class="cdUser011011-message-time">{{ formatTime(msg.timestamp) }}</span>
              <div v-if="msg.status === 'sending'" class="cdUser011011-message-status">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  />
                </svg>
              </div>
              <div
                v-else-if="msg.status === 'error'"
                class="cdUser011011-message-error"
                title="Failed to send"
              >
                !
              </div>
            </div>
          </div>
        </template>

        <!-- Typing indicator -->
        <div v-if="isAdminTyping" class="cdUser011011-typing-container">
          <div class="cdUser011011-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="cdUser011011-typing-text">Admin is typing...</span>
        </div>

        <!-- Initial loading -->
        <div v-if="loading && chatMessages.length === 0" class="cdUser011011-loading-state">
          <div class="cdUser011011-spinner" :style="customStyles"></div>
          <p>Loading messages...</p>
        </div>

        <!-- Empty state -->
        <div v-if="chatMessages.length === 0 && !loading" class="cdUser011011-empty-state">
          <div class="cdUser011011-empty-icon">
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
          </div>
          <h3 class="cdUser011011-empty-title">No messages yet</h3>
          <p class="cdUser011011-empty-subtitle">Start the conversation with your admin</p>
        </div>

        <!-- Scroll anchor for auto-scroll -->
        <div ref="messagesEndRef"></div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="cdUser011011-input-wrapper">
      <div class="cdUser011011-input-container">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          @input="handleInputChange"
          type="text"
          placeholder="Type a message..."
          :disabled="sending || !isConnected"
          class="cdUser011011-message-input"
          :style="customStyles"
          ref="messageInput"
        />
        <button
          @click="sendMessage"
          class="cdUser011011-send-btn"
          :disabled="!newMessage.trim() || sending || !isConnected"
          :style="customStyles"
          :title="newMessage.trim() ? 'Send message' : 'Type a message to send'"
        >
          <template v-if="!sending">
            <svg
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
          </template>
          <div v-else class="cdUser011011-btn-loader"></div>
        </button>
      </div>
      <div v-if="!isConnected" class="cdUser011011-connection-warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Connecting to chat...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Props & Emits
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

// Refs
const chatContainerRef = ref(null)
const messagesEndRef = ref(null)
const messageInput = ref(null)
const newMessage = ref('')
const showScrollButton = ref(false)

// Computed
const customStyles = computed(() => ({
  '--primary-color': props.primaryColor,
  '--secondary-color': props.secondaryColor,
}))

// Methods
const getBubbleStyle = (msg) => {
  if (msg.sender === 'user') {
    return {
      '--bubble-bg': props.primaryColor,
      '--bubble-text': '#ffffff',
    }
  }
  return {
    '--bubble-bg': '#ffffff',
    '--bubble-text': '#1f2937',
  }
}

const scrollToBottom = () => {
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  showScrollButton.value = false
}

const handleScroll = () => {
  if (!chatContainerRef.value) return

  const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.value
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

  showScrollButton.value = !isNearBottom

  // Load more messages when near top
  if (scrollTop < 100 && !loadingMore.value) {
    // Trigger load more
  }
}

// Auto-focus input on mount
onMounted(() => {
  messageInput.value?.focus()
})

// Scroll to bottom when new messages arrive
watch(
  () => chatMessages.value.length,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { flush: 'post' },
)

// Cleanup
onUnmounted(() => {
  // Cleanup any listeners
})
</script>

<style scoped>
/* ===== BASE STYLES ===== */
.cdUser011011-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #ffffff;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
}

/* ===== HEADER ===== */
.cdUser011011-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
  min-height: 60px;
}

@media (max-width: 640px) {
  .cdUser011011-chat-header {
    padding: 0.75rem;
    min-height: 56px;
  }
}

.cdUser011011-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.cdUser011011-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.cdUser011011-status-dot.active {
  background: var(--primary-color, #10b981);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1);
  }
}

.cdUser011011-header-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.cdUser011011-header-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cdUser011011-status-text {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 480px) {
  .cdUser011011-header-title {
    font-size: 0.875rem;
  }

  .cdUser011011-status-text {
    font-size: 0.6875rem;
  }
}

/* ===== SCROLL BUTTON ===== */
.cdUser011011-scroll-btn {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
  touch-action: manipulation;
}

.cdUser011011-scroll-btn:hover {
  background: #f9fafb;
  border-color: var(--primary-color, #10b981);
  transform: translateY(-1px);
}

.cdUser011011-scroll-btn:active {
  transform: translateY(0);
}

@media (max-width: 480px) {
  .cdUser011011-scroll-btn {
    width: 32px;
    height: 32px;
  }
}

/* ===== MESSAGES WRAPPER ===== */
.cdUser011011-messages-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fafafa;
  position: relative;
}

.cdUser011011-messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.cdUser011011-messages-container::-webkit-scrollbar {
  width: 6px;
}

.cdUser011011-messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.cdUser011011-messages-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.cdUser011011-messages-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

@media (max-width: 640px) {
  .cdUser011011-messages-container {
    padding: 0.75rem;
    gap: 0.5rem;
  }
}

@media (max-width: 360px) {
  .cdUser011011-messages-container {
    padding: 0.625rem;
  }
}

/* ===== LOADING MORE ===== */
.cdUser011011-loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.cdUser011011-mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: var(--primary-color, #10b981);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ===== DATE DIVIDER ===== */
.cdUser011011-date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.5rem 0;
  position: relative;
}

.cdUser011011-date-divider::before,
.cdUser011011-date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.cdUser011011-date-text {
  font-size: 0.6875rem;
  color: #9ca3af;
  font-weight: 500;
  padding: 0 0.75rem;
  background: #fafafa;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

@media (max-width: 480px) {
  .cdUser011011-date-text {
    font-size: 0.625rem;
    padding: 0 0.5rem;
  }
}

/* ===== MESSAGE ROW ===== */
.cdUser011011-message-row {
  display: flex;
  animation: slideUp 0.2s ease-out;
}

.cdUser011011-message-row.admin {
  justify-content: flex-start;
}

.cdUser011011-message-row.user {
  justify-content: flex-end;
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

/* ===== MESSAGE BUBBLE ===== */
.cdUser011011-message-bubble {
  max-width: min(75%, 480px);
  padding: 0.75rem 1rem;
  border-radius: 1.125rem;
  font-size: 0.875rem;
  line-height: 1.4;
  word-wrap: break-word;
  word-break: break-word;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cdUser011011-message-bubble.admin {
  background: var(--bubble-bg, #ffffff);
  color: var(--bubble-text, #1f2937);
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 0.25rem;
}

.cdUser011011-message-bubble.user {
  background: var(--bubble-bg, var(--primary-color, #10b981));
  color: var(--bubble-text, #ffffff);
  border-bottom-right-radius: 0.25rem;
}

@media (max-width: 640px) {
  .cdUser011011-message-bubble {
    max-width: 85%;
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .cdUser011011-message-bubble {
    max-width: 90%;
  }
}

.cdUser011011-message-text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.cdUser011011-message-time {
  font-size: 0.6875rem;
  opacity: 0.7;
  align-self: flex-end;
  margin-top: 0.125rem;
}

.cdUser011011-message-status,
.cdUser011011-message-error {
  position: absolute;
  bottom: 0.375rem;
  right: -1.25rem;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cdUser011011-message-status svg {
  animation: spin 1s linear infinite;
}

.cdUser011011-message-error {
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: bold;
}

/* ===== TYPING INDICATOR ===== */
.cdUser011011-typing-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 1.125rem;
  width: fit-content;
  margin-top: 0.25rem;
}

.cdUser011011-typing-indicator {
  display: flex;
  gap: 0.25rem;
}

.cdUser011011-typing-indicator span {
  width: 0.5rem;
  height: 0.5rem;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.cdUser011011-typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.cdUser011011-typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.cdUser011011-typing-indicator span:nth-child(3) {
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
    transform: translateY(-0.25rem);
    opacity: 1;
  }
}

.cdUser011011-typing-text {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

/* ===== LOADING STATE ===== */
.cdUser011011-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  color: #6b7280;
}

.cdUser011011-spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid #e5e7eb;
  border-top-color: var(--primary-color, #10b981);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

.cdUser011011-loading-state p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
}

/* ===== EMPTY STATE ===== */
.cdUser011011-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
}

.cdUser011011-empty-icon {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.cdUser011011-empty-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #6b7280;
}

.cdUser011011-empty-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: #9ca3af;
  max-width: 16rem;
}

/* ===== INPUT AREA ===== */
.cdUser011011-input-wrapper {
  background: #ffffff;
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
  padding: 0.75rem 1rem;
}

@media (max-width: 640px) {
  .cdUser011011-input-wrapper {
    padding: 0.75rem;
  }
}

.cdUser011011-input-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.cdUser011011-message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 1.5rem;
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
  background: #ffffff;
  font-family: inherit;
  min-height: 2.75rem;
  -webkit-appearance: none;
  appearance: none;
}

.cdUser011011-message-input:focus {
  border-color: var(--primary-color, #10b981);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.cdUser011011-message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.cdUser011011-message-input::placeholder {
  color: #9ca3af;
  font-size: 0.875rem;
}

@media (max-width: 480px) {
  .cdUser011011-message-input {
    font-size: 1rem; /* Prevent zoom on iOS */
    padding: 0.75rem 0.875rem;
    min-height: 2.625rem;
  }
}

/* ===== SEND BUTTON ===== */
.cdUser011011-send-btn {
  background: var(--primary-color, #10b981);
  color: white;
  border: none;
  border-radius: 50%;
  width: 2.75rem;
  height: 2.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  touch-action: manipulation;
  position: relative;
  overflow: hidden;
}

.cdUser011011-send-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0);
  transition: background 0.2s ease;
}

.cdUser011011-send-btn:hover:not(:disabled)::before {
  background: rgba(255, 255, 255, 0.1);
}

.cdUser011011-send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.cdUser011011-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.cdUser011011-btn-loader {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (max-width: 480px) {
  .cdUser011011-send-btn {
    width: 2.625rem;
    height: 2.625rem;
  }
}

/* ===== CONNECTION WARNING ===== */
.cdUser011011-connection-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: #92400e;
}

.cdUser011011-connection-warning svg {
  flex-shrink: 0;
}

/* ===== DARK MODE SUPPORT ===== */
@media (prefers-color-scheme: dark) {
  .cdUser011011-chat-container {
    background: #1f2937;
  }

  .cdUser011011-chat-header {
    background: #1f2937;
    border-bottom-color: #374151;
  }

  .cdUser011011-header-title {
    color: #f9fafb;
  }

  .cdUser011011-status-text {
    color: #d1d5db;
  }

  .cdUser011011-scroll-btn {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .cdUser011011-scroll-btn:hover {
    background: #4b5563;
  }

  .cdUser011011-messages-wrapper {
    background: #111827;
  }

  .cdUser011011-messages-container::-webkit-scrollbar-thumb {
    background: #4b5563;
  }

  .cdUser011011-messages-container::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  .cdUser011011-date-text {
    background: #111827;
    color: #9ca3af;
  }

  .cdUser011011-date-divider::before,
  .cdUser011011-date-divider::after {
    background: #374151;
  }

  .cdUser011011-message-bubble.admin {
    background: #374151;
    color: #f9fafb;
    border-color: #4b5563;
  }

  .cdUser011011-typing-container {
    background: #374151;
    border-color: #4b5563;
  }

  .cdUser011011-typing-indicator span {
    background: #9ca3af;
  }

  .cdUser011011-empty-icon {
    color: #6b7280;
  }

  .cdUser011011-empty-title {
    color: #e5e7eb;
  }

  .cdUser011011-empty-subtitle {
    color: #9ca3af;
  }

  .cdUser011011-input-wrapper {
    background: #1f2937;
    border-top-color: #374151;
  }

  .cdUser011011-message-input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .cdUser011011-message-input:focus {
    background: #374151;
  }

  .cdUser011011-message-input::placeholder {
    color: #9ca3af;
  }

  .cdUser011011-connection-warning {
    background: #78350f;
    border-color: #92400e;
    color: #fde68a;
  }
}

/* ===== SAFE AREA SUPPORT ===== */
@supports (padding: max(0px)) {
  .cdUser011011-input-wrapper {
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  }
}

/* ===== ORIENTATION ADJUSTMENTS ===== */
@media (orientation: landscape) and (max-height: 500px) {
  .cdUser011011-chat-header {
    padding: 0.5rem;
    min-height: 48px;
  }

  .cdUser011011-messages-container {
    padding: 0.5rem;
    gap: 0.375rem;
  }

  .cdUser011011-message-bubble {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }

  .cdUser011011-input-wrapper {
    padding: 0.5rem;
  }

  .cdUser011011-message-input {
    min-height: 2.5rem;
    font-size: 0.875rem;
  }

  .cdUser011011-send-btn {
    width: 2.5rem;
    height: 2.5rem;
  }
}
</style>
