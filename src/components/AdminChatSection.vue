<script setup>
import { ref, nextTick, onMounted } from 'vue'
import axios from 'axios'
// Assuming getUserId is correctly imported and returns the session ID
import getUserId from './utils/userId'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sending = ref(false)
const loading = ref(false)
const chatMessages = ref([])
const newMessage = ref('')

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

// Synchronous sessionId retrieval (runs before setup completes)
const sessionId = getUserId(cleanWebsite)
console.log('admin-side sessionId:', sessionId)

// --- Utility Functions ---

const saveMessages = () => {
  if (!props.userId || chatMessages.value.length === 0) return
  const payload = {
    timestamp: Date.now(),
    chatMessages: chatMessages.value,
  }
  // Saving based on props.userId for isolation, but using sessionId for fetching/sending.
  localStorage.setItem(`chatMessages_${props.userId}`, JSON.stringify(payload))
}

const getMessage = async () => {
  // CRITICAL FIX 1: Check if sessionId exists before making the API call.
  if (!cleanWebsite || !sessionId) {
    console.warn('Skipping message fetch: Website or Session ID not ready.')
    return
  }
  try {
    loading.value = true
    const response = await axios.get(
      `https://assitance.storehive.com.ng/public/api/chat/admin/session/${sessionId}`,
      { params: { website: props.website } },
    )
    console.log('Successfully fetched session messages for:', sessionId)
    // Assuming the messages array contains objects with a 'sender' property ('user' or 'admin')
    chatMessages.value = response.data.data?.messages || []

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Failed to fetch all request:', error)
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value || !sessionId) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = '' // Clear input immediately

  // Optimistically add the message to the UI
  // Add message with sender: 'admin' so it appears on the LEFT
  chatMessages.value.push({
    message: messageToSend,
    sender: 'admin',
    timestamp: Date.now(),
  })
  nextTick().then(scrollToBottom)

  try {
    sending.value = true
    await axios.post('https://assitance.storehive.com.ng/public/api/chat/admin/message', {
      session_id: sessionId,
      message: messageToSend,
      website: props.website,
      // CRITICAL FIX 2: Admin is sending the reply, so sender_type must be 'admin'
      sender_type: 'admin',
    })

    // Optional: wait a moment for the backend to process
    // await new Promise((resolve) => setTimeout(resolve, 500))

    // Refresh all messages from the backend to ensure conversation continuity
    await getMessage()
  } catch (err) {
    console.error(err)
    // If API failed, you might want to remove the message we optimistically added
    chatMessages.value.pop()
    newMessage.value = messageToSend // Restore message on error
  } finally {
    sending.value = false
    saveMessages()
  }
}

const chatContainerRef = ref(null)
const scrollToBottom = () => {
  if (chatContainerRef.value) {
    // Use requestAnimationFrame for smoother scrolling if it's struggling
    requestAnimationFrame(() => {
      chatContainerRef.value.scrollTo({
        top: chatContainerRef.value.scrollHeight,
        behavior: 'smooth',
      })
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

// --- Combined OnMounted Hook for Auth and Fetching ---
onMounted(async () => {
  // CRITICAL FIX 3: If the session ID is not available immediately, stop.
  if (!sessionId) {
    console.error('Session ID is null/undefined on mount. Aborting message load.')
    return
  }

  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 1 * 24 * 60 * 60 * 1000

  if (stored) {
    const data = JSON.parse(stored)
    if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
      localStorage.removeItem(`chatMessages_${props.userId}`)
      await getMessage() // fetch from backend if local data is expired
    } else {
      chatMessages.value = data.chatMessages
      await nextTick()
      scrollToBottom()
      // Still refresh from server after showing local data to get latest messages
      setTimeout(getMessage, 500) // Small delay to prevent network contention
    }
  } else {
    await getMessage() // no stored data, fetch previous messages
  }
})
</script>

<template>
  <div class="cdUser011011-chat-container">
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-content">
        <div class="cdUser011011-status-indicator">
          <div class="cdUser011011-status-dot"></div>
          <span>Admin Panel | Session: {{ sessionId.substring(0, 8) }}...</span>
        </div>
        <button
          @click="getMessage"
          :disabled="loading || sending"
          class="cdUser011011-refresh-btn"
          title="Refresh Messages"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            :class="{ 'cdUser011011-spinning': loading }"
          >
            <path
              fill="currentColor"
              d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.77 2.2-2.89 3.8-5.65 3.8c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.01 0 1.97.23 2.8.64l-3.1-3.1H19V2z"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="cdUser011011-messages-wrapper">
      <div v-if="loading && chatMessages.length === 0" class="cdUser011011-loading-wrapper">
        <div class="cdUser011011-loader"></div>
        <p class="cdUser011011-loading-text">Loading chat history...</p>
      </div>
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="cdUser011011-message-row"
          :class="msg.sender"
        >
          <!-- Avatars are not used but kept in CSS for future extension -->
          <div class="cdUser011011-message-content">
            <div class="cdUser011011-bubble-wrapper">
              <div class="cdUser011011-message-bubble" :class="`cdUser011011-bubble-${msg.sender}`">
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
          <span>Awaiting the first customer interaction</span>
        </div>
      </div>
    </div>

    <div class="cdUser011011-input-wrapper">
      <div class="cdUser011011-input-container">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your reply to the user..."
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
/* ------------------------------------------------------------------- */
/* GLOBAL STYLES & CONTAINER */
/* ------------------------------------------------------------------- */
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ------------------------------------------------------------------- */
/* HEADER */
/* ------------------------------------------------------------------- */
.cdUser011011-chat-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 14px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.cdUser011011-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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
  border-radius: 50%;
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

/* ------------------------------------------------------------------- */
/* MESSAGES AREA */
/* ------------------------------------------------------------------- */

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

/* Scrollbar styles (optional but nice) */
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

/* ALIGNMENT LOGIC: */

/* Admin messages (Replies) go LEFT */
.cdUser011011-message-row.admin {
  justify-content: flex-start;
}
/* User messages (Initial queries & subsequent user inputs) go RIGHT */
.cdUser011011-message-row.user {
  justify-content: flex-end;
}

.cdUser011011-message-content {
  display: flex;
  gap: 10px;
  max-width: 75%;
  align-items: flex-end;
}

/* Ensure content flow is reversed for right-aligned bubbles */
.cdUser011011-message-row.user .cdUser011011-message-content {
  flex-direction: row-reverse;
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

/* STYLE: Admin (Left) - Use a light/neutral color */
.cdUser011011-bubble-admin {
  background: #ffffff; /* White background */
  color: #1f2937;
  /* Pointy bottom-left corner */
  border-bottom-left-radius: 4px;
}

/* STYLE: User (Right) - Use a prominent color */
.cdUser011011-bubble-user {
  background: linear-gradient(135deg, #009970 0%, #00b383 100%); /* Green gradient */
  color: #ffffff;
  /* Pointy bottom-right corner */
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

/* ------------------------------------------------------------------- */
/* INPUT AREA */
/* ------------------------------------------------------------------- */
.cdUser011011-input-wrapper {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
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
