<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import getUserId from './utils/userId'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sessionId = ref(null) // ← Reactive session ID
const chatMessages = ref([])
const loading = ref(true)
const sending = ref(false)
const newMessage = ref('')

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

// Step 1: Load sessionId (supports async getUserId)
const loadSessionId = async () => {
  try {
    const id = await getUserId(cleanWebsite)
    sessionId.value = id
    console.log('Session ID loaded:', id)
  } catch (err) {
    console.error('Failed to load session ID:', err)
  }
}

// Step 2: Fetch previous messages from backend
const getMessages = async () => {
  if (!sessionId.value) {
    console.log('Waiting for sessionId...')
    return
  }

  try {
    loading.value = true
    const response = await axios.get(
      `https://assitance.storehive.com.ng/public/api/chat/admin/session/${sessionId.value}`,
      { params: { website: props.website } },
    )

    const messages = response.data.data?.messages || []
    chatMessages.value = messages.map((msg) => ({
      ...msg,
      sender: msg.sender_type === 'admin' ? 'admin' : 'user', // ← Normalize sender
    }))
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    if (error.response?.status === 404) {
      chatMessages.value = [] // New session = empty chat
    }
  } finally {
    loading.value = false
  }
}

// Send message as ADMIN
const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value || !sessionId.value) return

  const messageText = newMessage.value.trim()
  newMessage.value = ''

  // Optimistic UI
  const tempMessage = {
    message: messageText,
    sender: 'admin',
    timestamp: new Date().toISOString(),
    temp: true,
  }
  chatMessages.value.push(tempMessage)

  try {
    sending.value = true
    await axios.post('https://assitance.storehive.com.ng/public/api/chat/admin/message', {
      session_id: sessionId.value,
      message: messageText,
      website: props.website,
      sender_type: 'admin', // ← THIS WAS THE ALIGNMENT BUG!
    })

    // Refresh messages from server
    await getMessages()
    await nextTick()
    scrollToBottom()
  } catch (err) {
    console.error('Send failed:', err)
    // Remove optimistic message
    chatMessages.value = chatMessages.value.filter((m) => !m.temp)
    newMessage.value = messageText
  } finally {
    sending.value = false
  }
}

// Scroll to bottom
const chatContainerRef = ref(null)
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

// Format time
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

// ON MOUNT: Load session → load messages
onMounted(async () => {
  await loadSessionId()
  if (sessionId.value) {
    await getMessages()
    await nextTick()
    scrollToBottom()
  }
})
</script>

<template>
  <div class="cdUser011011-chat-container">
    <!-- Header -->
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-content">
        <div class="cdUser011011-status-indicator">
          <div class="cdUser011011-status-dot"></div>
          <span>Admin Chat</span>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="cdUser011011-messages-wrapper">
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
        <!-- Loading State -->
        <div v-if="loading" class="cdUser011011-loading-wrapper">
          <div class="cdUser011011-loader"></div>
          <p class="cdUser011011-loading-text">Loading messages...</p>
        </div>

        <!-- Messages -->
        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="cdUser011011-message-row"
          :class="msg.sender"
        >
          <div class="cdUser011011-message-content">
            <div class="cdUser011011-bubble-wrapper">
              <div class="cdUser011011-message-bubble" :class="`cdUser011011-bubble-${msg.sender}`">
                <p class="cdUser011011-message-text">{{ msg.message }}</p>
              </div>
              <span class="cdUser011011-message-time">
                {{ formatTime(msg.timestamp) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && chatMessages.length === 0" class="cdUser011011-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"
            />
          </svg>
          <p>No messages yet</p>
          <span>Start replying to this user</span>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="cdUser011011-input-wrapper">
      <div class="cdUser011011-input-container">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your reply..."
          :disabled="sending || !sessionId"
          class="cdUser011011-message-input"
        />
        <button
          @click="sendMessage"
          :disabled="!newMessage.trim() || sending || !sessionId"
          class="cdUser011011-send-btn"
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

/* Loading State */
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

/* Messages Area */
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

/* Empty State */
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

/* Message Row */
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

.cdUser011011-message-row.admin {
  justify-content: flex-start;
}

.cdUser011011-message-row.user {
  justify-content: flex-end;
}

.cdUser011011-message-content {
  display: flex;
  gap: 10px;
  max-width: 75%;
  align-items: flex-end;
  margin: 0;
}

.cdUser011011-message-row.user .cdUser011011-message-content {
  flex-direction: row-reverse;
}

/* Avatar */
.cdUser011011-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 0;
}

.cdUser011011-avatar-admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.cdUser011011-avatar-user {
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
  color: white;
}

/* Bubble Wrapper */
.cdUser011011-bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.cdUser011011-message-row.user .cdUser011011-bubble-wrapper {
  align-items: flex-end;
}

/* Message Bubble */
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

.cdUser011011-bubble-admin {
  background: #ffffff;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

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

/* Input Area */
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
