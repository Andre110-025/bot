<script setup>
import { ref, nextTick, onMounted, watch } from 'vue'
import axios from 'axios'
import getUserId from './utils/userId'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sending = ref(false)
const loading = ref(false)
const chatMessages = ref([])
const allChats = ref([])
const newMessage = ref('')
const sessionId = ref(null)
const isReady = ref(false)

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

// Initialize sessionId with a slight delay to ensure localStorage is ready
const initializeSessionId = () => {
  return new Promise((resolve) => {
    // Try multiple times with delays if needed
    let attempts = 0
    const maxAttempts = 5

    const tryGetId = () => {
      const id = getUserId(cleanWebsite)
      console.log('Attempt', attempts + 1, 'Getting sessionId:', id)

      if (id) {
        sessionId.value = id
        console.log('SessionId initialized:', sessionId.value)
        resolve(id)
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(tryGetId, 200) // Wait 200ms before trying again
      } else {
        console.error('Failed to get sessionId after', maxAttempts, 'attempts')
        resolve(null)
      }
    }

    tryGetId()
  })
}

const getMessage = async () => {
  if (!sessionId.value || !cleanWebsite) {
    console.warn('Cannot fetch messages: sessionId or cleanWebsite missing')
    return
  }

  try {
    loading.value = true
    console.log('Fetching messages for session:', sessionId.value)

    const response = await axios.get(
      `https://assitance.storehive.com.ng/public/api/chat/admin/session/${sessionId.value}`,
      { params: { website: props.website } },
    )

    console.log('API Response:', response.data)
    console.log('Messages received:', response.data.data?.messages)

    const messages = response.data.data?.messages || []

    // Log each message to debug sender_type
    messages.forEach((msg, index) => {
      console.log(`Message ${index}:`, {
        message: msg.message,
        sender_type: msg.sender_type,
        sender: msg.sender,
      })
    })

    chatMessages.value = messages

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    if (error.response) {
      console.error('Error response:', error.response.data)
    }
  } finally {
    loading.value = false
  }
}

const addMessage = (msg) => {
  chatMessages.value.push(msg)
  saveMessages()
  nextTick().then(scrollToBottom)
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value || !sessionId.value) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = ''

  try {
    sending.value = true
    const response = await axios.post(
      'https://assitance.storehive.com.ng/public/api/chat/admin/message',
      {
        session_id: sessionId.value,
        message: messageToSend,
        website: props.website,
        sender_type: 'admin',
      },
    )

    console.log('Message sent:', response.data)

    await new Promise((resolve) => setTimeout(resolve, 500))

    await getMessage()
    await nextTick()
    scrollToBottom()
  } catch (err) {
    console.error('Failed to send message:', err)
    if (err.response) {
      console.error('Error response:', err.response.data)
    }
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

// Helper function to determine message alignment
const getMessageAlignment = (msg) => {
  const senderType = msg.sender_type || msg.sender
  console.log('Message alignment check:', { senderType, message: msg.message })
  // User messages go right, admin messages go left
  return senderType === 'user' ? 'right' : 'left'
}

onMounted(async () => {
  console.log('Component mounted, initializing...')

  // First, initialize the sessionId
  await initializeSessionId()

  if (!sessionId.value) {
    console.error('Failed to initialize sessionId')
    return
  }

  isReady.value = true

  // Check localStorage for cached messages
  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 1 * 24 * 60 * 60 * 1000

  if (stored) {
    try {
      const data = JSON.parse(stored)
      if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
        console.log('Cached messages expired, removing...')
        localStorage.removeItem(`chatMessages_${props.userId}`)
        await getMessage()
      } else {
        console.log('Loading cached messages')
        chatMessages.value = data.chatMessages
        await nextTick()
        scrollToBottom()
        // Still fetch fresh data in background
        setTimeout(() => {
          getMessage()
        }, 1000)
      }
    } catch (error) {
      console.error('Error parsing stored messages:', error)
      localStorage.removeItem(`chatMessages_${props.userId}`)
      await getMessage()
    }
  } else {
    console.log('No cached messages, fetching from server...')
    await getMessage()
  }
})

// Watch for sessionId changes
watch(sessionId, (newVal) => {
  console.log('SessionId changed to:', newVal)
})
</script>

<template>
  <div class="cdUser011011-chat-container">
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-content">
        <div class="cdUser011011-status-indicator">
          <div class="cdUser011011-status-dot"></div>
          <span>Admin Panel</span>
        </div>
        <button
          v-if="isReady"
          @click="getMessage"
          :disabled="loading"
          class="cdUser011011-refresh-btn"
        >
          <svg
            :class="{ 'cdUser011011-spinning': loading }"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="cdUser011011-messages-wrapper">
      <div v-if="!isReady" class="cdUser011011-loading-wrapper">
        <div class="cdUser011011-loader"></div>
        <p class="cdUser011011-loading-text">Initializing chat...</p>
      </div>

      <div v-else ref="chatContainerRef" class="cdUser011011-messages-container">
        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="cdUser011011-message-row"
          :class="getMessageAlignment(msg)"
        >
          <div class="cdUser011011-message-content">
            <div class="cdUser011011-bubble-wrapper">
              <div
                class="cdUser011011-message-bubble"
                :class="[
                  getMessageAlignment(msg) === 'right'
                    ? 'cdUser011011-bubble-user'
                    : 'cdUser011011-bubble-admin',
                ]"
              >
                <p class="cdUser011011-message-text">{{ msg.message }}</p>
              </div>
              <span class="cdUser011011-message-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
        </div>
        <div v-if="chatMessages.length === 0 && !loading" class="cdUser011011-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"
            />
          </svg>
          <p>No messages yet</p>
          <span>Start a conversation below</span>
        </div>
      </div>
    </div>

    <div class="cdUser011011-input-wrapper">
      <div class="cdUser011011-input-container">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your message..."
          :disabled="sending || !isReady"
          class="cdUser011011-message-input"
        />
        <button
          @click="sendMessage"
          class="cdUser011011-send-btn"
          :disabled="!newMessage.trim() || sending || !isReady"
        >
          <svg
            v-if="!sending"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M2.01 21L23 12L2.01 3L2 10l15 2l-15 2z" />
          </svg>
          <div v-else class="cdUser011011-btn-loader"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.cdUser011011-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  background: #f8f9fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.cdUser011011-chat-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.cdUser011011-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
}

.cdUser011011-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #111827;
  margin: 0;
}

.cdUser011011-status-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: cdUser011011-pulse 2s infinite;
}

@keyframes cdUser011011-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.cdUser011011-refresh-btn {
  background: transparent;
  border: none;
  padding: 8px;
  margin: 0;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cdUser011011-refresh-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #009970;
}

.cdUser011011-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cdUser011011-spinning {
  animation: cdUser011011-spin 1s linear infinite;
}

@keyframes cdUser011011-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.cdUser011011-loading-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 12px;
  padding: 20px;
}

.cdUser011011-loader {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #009970;
  border-radius: 50%;
  animation: cdUser011011-spin 0.8s linear infinite;
}

.cdUser011011-loading-text {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.cdUser011011-messages-wrapper {
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
  min-height: 0;
}

.cdUser011011-messages-container {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
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

.cdUser011011-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  gap: 8px;
  padding: 20px;
}

.cdUser011011-empty-state svg {
  opacity: 0.5;
  margin-bottom: 8px;
}

.cdUser011011-empty-state p {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
}

.cdUser011011-empty-state span {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

.cdUser011011-message-row {
  display: flex;
  margin: 0;
  animation: cdUser011011-slideIn 0.3s ease-out;
}

@keyframes cdUser011011-slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* LEFT alignment for admin messages */
.cdUser011011-message-row.left {
  justify-content: flex-start;
}

/* RIGHT alignment for user messages */
.cdUser011011-message-row.right {
  justify-content: flex-end;
}

.cdUser011011-message-content {
  display: flex;
  gap: 10px;
  max-width: 75%;
  align-items: flex-end;
  margin: 0;
}

.cdUser011011-message-row.right .cdUser011011-message-content {
  flex-direction: row-reverse;
}

.cdUser011011-bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.cdUser011011-message-row.right .cdUser011011-bubble-wrapper {
  align-items: flex-end;
}

.cdUser011011-message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14.5px;
  line-height: 1.5;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  margin: 0;
}

/* Admin messages - white background, left side */
.cdUser011011-bubble-admin {
  background: #ffffff;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

/* User messages - green gradient, right side */
.cdUser011011-bubble-user {
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.cdUser011011-message-text {
  margin: 0;
  white-space: pre-wrap;
}

.cdUser011011-message-time {
  font-size: 11px;
  color: #9ca3af;
  padding: 0 4px;
  margin: 0;
}

.cdUser011011-input-wrapper {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.cdUser011011-input-container {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 0;
}

.cdUser011011-message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  background: #f9fafb;
  margin: 0;
}

.cdUser011011-message-input:focus {
  border-color: #009970;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 153, 112, 0.1);
}

.cdUser011011-message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cdUser011011-send-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 153, 112, 0.3);
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

.cdUser011011-send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 153, 112, 0.4);
}

.cdUser011011-send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.cdUser011011-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.cdUser011011-btn-loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: cdUser011011-spin 0.8s linear infinite;
}
</style>
