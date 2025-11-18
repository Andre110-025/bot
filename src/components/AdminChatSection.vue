<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
})

const loading = ref(false)
const sending = ref(false)
const chatMessages = ref([])
const newMessage = ref('')

const getAllChats = async () => {
  try {
    loading.value = true
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const res = await axios.get(`http://localhost:3000/api/user/chat/${props.userId}`)
    chatMessages.value = res.data
    await nextTick()
    scrollToBottom()
  } catch (err) {
    console.error('Failed to fetch messages:', err)
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = ''

  try {
    sending.value = true
    await axios.post(`http://localhost:3000/api/user/chat`, {
      userId: props.userId,
      message: messageToSend,
      isActive: 'yes',
    })
    await getAllChats()
  } catch (err) {
    console.error(err)
    newMessage.value = messageToSend // Restore message on error
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

// Format time helper
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  getAllChats()
})

watch(chatMessages, () => {
  nextTick(() => scrollToBottom())
})
</script>

<template>
  <div class="cdUser011011-chat-container">
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-content">
        <div class="cdUser011011-status-indicator">
          <div class="cdUser011011-status-dot"></div>
          <span>Admin</span>
        </div>
        <button
          @click="getAllChats"
          class="cdUser011011-refresh-btn"
          :disabled="loading"
          title="Refresh chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            :class="{ 'cdUser011011-spinning': loading }"
          >
            <path
              fill="currentColor"
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8m0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4z"
            />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="loading && chatMessages.length === 0" class="cdUser011011-loading-wrapper">
      <div class="cdUser011011-loader"></div>
      <p class="cdUser011011-loading-text">Loading messages...</p>
    </div>

    <div v-else class="cdUser011011-messages-wrapper">
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
        <div v-if="chatMessages.length === 0" class="cdUser011011-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"
            />
          </svg>
          <p>No messages yet</p>
          <span>Start a conversation below</span>
        </div>

        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="cdUser011011-message-row"
          :class="msg.sender"
        >
          <div class="cdUser011011-message-content">
            <div class="cdUser011011-avatar" :class="`cdUser011011-avatar-${msg.sender}`">
              <svg
                v-if="msg.sender === 'admin'"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z"
                />
                <circle cx="12" cy="8.5" r="2.5" fill="currentColor" />
              </svg>
              <svg
                v-else
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

            <div class="cdUser011011-bubble-wrapper">
              <div class="cdUser011011-message-bubble" :class="`cdUser011011-bubble-${msg.sender}`">
                <p class="cdUser011011-message-text">{{ msg.text }}</p>
              </div>
              <span class="cdUser011011-message-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
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
          :disabled="sending"
          class="cdUser011011-message-input"
        />
        <button
          @click="sendMessage"
          class="cdUser011011-send-btn"
          :disabled="!newMessage.trim() || sending"
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
  background: #f8f9fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Header */
.cdUser011011-chat-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 2px 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.cdUser011011-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cdUser011011-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #111827;
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
}

/* Message Row */
.cdUser011011-message-row {
  display: flex;
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
}

/* Input Area */
.cdUser011011-input-wrapper {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.05);
}

.cdUser011011-input-container {
  display: flex;
  gap: 12px;
  align-items: center;
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
