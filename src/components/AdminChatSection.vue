<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import axios from 'axios'
import getUserId from './utils/userId'
import { useAbly } from '../composables/userAbly'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sending = ref(false)
const loading = ref(false)
const chatMessages = ref([])
const newMessage = ref('')
const isTyping = ref(false)

// Initialize Ably Composables
const { initializeAbly, onAdminReply, isConnected, disconnect } = useAbly()
let unsubscribeFromAbly = () => {}

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

const saveMessages = () => {
  if (!props.userId) return
  const payload = {
    timestamp: Date.now(),
    chatMessages: chatMessages.value,
  }
  localStorage.setItem(`chatMessages_${props.userId}`, JSON.stringify(payload))
}

const sessionId = getUserId(cleanWebsite)

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
// onMounted(() => {
//   fetchInitialMessages()
// })

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = ''

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

    // Simulate typing indicator for admin response
    isTyping.value = true
    setTimeout(() => {
      isTyping.value = false
    }, 3000)
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
  isTyping.value = false

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
}

// Computed property for status text
const statusText = computed(() => {
  if (!isConnected.value) return 'Connecting...'
  if (isTyping.value) return 'Admin is typing...'
  return 'Online'
})

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

  const isAblyInitialized = await initializeAbly()
  if (isAblyInitialized) {
    unsubscribeFromAbly = onAdminReply(sessionId, handleAdminReply)
  }
})

onBeforeUnmount(() => {
  unsubscribeFromAbly()
  disconnect()
})
</script>

<template>
  <div class="chat-container">
    <!-- Enhanced Header -->
    <div class="chat-header">
      <div class="header-content">
        <div class="admin-info">
          <div class="admin-avatar">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div class="admin-details">
            <h3>Support Team</h3>
            <div class="status-indicator">
              <div
                class="status-dot"
                :class="{
                  online: isConnected,
                  offline: !isConnected,
                  typing: isTyping,
                }"
              ></div>
              <span class="status-text">{{ statusText }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="messages-wrapper">
      <div ref="chatContainerRef" class="messages-container">
        <!-- Date Dividers and Messages -->
        <template v-for="(msg, i) in chatMessages" :key="msg.id || i">
          <div
            v-if="
              i === 0 ||
              new Date(msg.timestamp).toDateString() !==
                new Date(chatMessages[i - 1].timestamp).toDateString()
            "
            class="date-divider"
          >
            <span>{{
              new Date(msg.timestamp).toDateString() === new Date().toDateString()
                ? 'Today'
                : new Date(msg.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
            }}</span>
          </div>

          <div class="message-row" :class="getMessageAlignment(msg)">
            <div class="message-content">
              <div class="avatar" :class="`avatar-${getMessageAlignment(msg)}`">
                <span v-if="getMessageAlignment(msg) === 'admin'">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                    />
                  </svg>
                </span>
                <span v-else>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    />
                  </svg>
                </span>
              </div>

              <div class="bubble-wrapper">
                <div class="message-bubble" :class="`bubble-${getMessageAlignment(msg)}`">
                  <p class="message-text">{{ msg.message }}</p>
                  <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Typing Indicator -->
        <div v-if="isTyping" class="message-row admin">
          <div class="message-content">
            <div class="avatar avatar-admin">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                />
              </svg>
            </div>
            <div class="bubble-wrapper">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading messages...</p>
        </div>

        <!-- Empty State -->
        <div v-if="chatMessages.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>Start a conversation</h3>
          <p>Send a message to get help from our support team</p>
        </div>
      </div>
    </div>

    <!-- Enhanced Input Area -->
    <div class="input-wrapper">
      <div class="input-container">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your message..."
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          <div v-else class="btn-loader"></div>
        </button>
      </div>
      <div v-if="!isConnected" class="connection-warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Connecting to chat service...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  background: linear-gradient(to bottom, #f0f4f8, #ffffff);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Enhanced Header */
.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.admin-details h3 {
  margin: 0;
  color: white;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
  animation: pulse 2s infinite;
}

.status-dot.offline {
  background: #ef4444;
}

.status-dot.typing {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
}

/* Messages Area */
.messages-wrapper {
  flex: 1;
  overflow: hidden;
  background: #ffffff;
  min-height: 0;
}

.messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* Date Divider */
.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  position: relative;
}

.date-divider::before,
.date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #e5e7eb, transparent);
}

.date-divider span {
  padding: 0 16px;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Message Row */
.message-row {
  display: flex;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
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

.message-content {
  display: flex;
  gap: 10px;
  max-width: 75%;
  align-items: flex-end;
}

.message-row.user .message-content {
  flex-direction: row-reverse;
}

/* Avatar */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar-admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.avatar-user {
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
}

/* Bubble Wrapper */
.bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Message Bubble */
.message-bubble {
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  position: relative;
  transition: all 0.2s ease;
}

.message-bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.bubble-admin {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 6px;
}

.bubble-user {
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
  color: #ffffff;
  border-bottom-right-radius: 6px;
}

.message-text {
  margin: 0;
  white-space: pre-wrap;
}

.message-time {
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
  display: block;
  text-align: right;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
  background: #f3f4f6;
  border-radius: 20px;
  border-bottom-left-radius: 6px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
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
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 40px;
  text-align: center;
}

.empty-icon {
  color: #d1d5db;
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #9ca3af;
  max-width: 280px;
}

/* Enhanced Input Area */
.input-wrapper {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 14px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 28px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: #f9fafb;
}

.message-input:focus {
  border-color: #009970;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(0, 153, 112, 0.1);
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f3f4f6;
}

.send-btn {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 153, 112, 0.3);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 153, 112, 0.4);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  background: #9ca3af;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Connection Warning */
.connection-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

.connection-warning svg {
  flex-shrink: 0;
  color: #f59e0b;
}

/* Responsive Design */
@media (max-width: 640px) {
  .chat-header {
    padding: 16px 20px;
  }

  .admin-avatar {
    width: 40px;
    height: 40px;
  }

  .messages-container {
    padding: 16px;
  }

  .message-content {
    max-width: 85%;
  }

  .input-wrapper {
    padding: 12px 16px;
  }

  .message-input {
    padding: 12px 16px;
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
</style>
