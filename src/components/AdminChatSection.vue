<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import axios from 'axios'
import { getUserId } from './utils/userId'
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
  <div class="cdUser011011-chat-container">
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-left">
        <div class="cdUser011011-status-dot" :class="{ active: isConnected }"></div>
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
            <div class="cdUser011011-message-bubble" :class="getMessageAlignment(msg)">
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
          <div class="cdUser011011-spinner"></div>
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
      />
      <button
        @click="sendMessage"
        class="cdUser011011-send-btn"
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
          <line x1="22" y1="2" />
        </svg>
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
  background: #10b981;
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
  background: #009970;
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
  border-top-color: #009970;
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
  border-color: #009970;
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

.cdUser011011-send-btn:hover:not(:disabled) {
  background: #00805d;
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
