<template>
  <div class="cdUser011011-chat-container">
    <!-- HEADER -->
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-content">
        <div class="cdUser011011-status-indicator">
          <div class="cdUser011011-status-dot"></div>
          <span>Admin</span>
        </div>
      </div>
    </div>

    <!-- MESSAGES AREA -->
    <div class="cdUser011011-messages-wrapper">
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
        <!-- MESSAGE LOOP -->
        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="cdUser011011-message-row"
          :class="msg.sender"
        >
          <div class="cdUser011011-bubble-wrapper">
            <div class="cdUser011011-message-bubble" :class="`cdUser011011-bubble-${msg.sender}`">
              <p class="cdUser011011-message-text">{{ msg.text }}</p>
            </div>
            <span class="cdUser011011-message-time">
              {{ formatTime(msg.timestamp) }}
            </span>
          </div>
        </div>

        <!-- EMPTY STATE -->
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
      </div>
    </div>

    <!-- INPUT AREA -->
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

<script setup>
import { ref, onMounted } from 'vue'
import SignInForm from './SignInForm.vue'
import AdminChatSection from './AdminChatSection.vue'

const showPopup = ref(false)
const showChat = ref(false)
const showUserBotChat = ref(true)
const messages = ref([])
const typingMessageIndex = ref(-1)
const displayedTexts = ref({})
const userInput = ref('')
const userId = ref(localStorage.getItem('userId'))

// Toggle popup
const togglePopup = () => (showPopup.value = !showPopup.value)

// Activate Admin mode with 24h persistence
const activateAdminMode = () => {
  showUserBotChat.value = false
  localStorage.setItem(
    'adminMode',
    JSON.stringify({ active: true, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }),
  )
}

// Check localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('adminMode')
  if (saved) {
    const data = JSON.parse(saved)
    if (Date.now() < data.expiresAt) {
      showUserBotChat.value = false
    } else {
      localStorage.removeItem('adminMode')
    }
  }
})
</script>

<style>
/* === MAIN CHAT LAYOUT === */
.cdUser011011-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.cdUser011011-messages-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.cdUser011011-messages-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* === MESSAGE ROW ALIGNMENT === */
.cdUser011011-message-row {
  display: flex;
  width: 100%;
}

.cdUser011011-message-row.admin {
  justify-content: flex-start;
}

.cdUser011011-message-row.user {
  justify-content: flex-end;
}

/* === BUBBLE WRAPPER === */
.cdUser011011-bubble-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

/* === MESSAGE BUBBLES === */
.cdUser011011-message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  position: relative;
}

/* ADMIN BUBBLE (left) */
.cdUser011011-bubble-admin {
  background: #e2e8f0; /* light gray */
  color: #111;
  border-bottom-left-radius: 4px;
}

/* USER BUBBLE (right) */
.cdUser011011-bubble-user {
  background: #14b8a6; /* teal */
  color: #fff;
  border-bottom-right-radius: 4px;
}

/* === TIMESTAMP === */
.cdUser011011-message-time {
  margin-top: 4px;
  font-size: 11px;
  color: #8a8a8a;
  user-select: none;
}

/* === EMPTY STATE === */
.cdUser011011-empty-state {
  margin-top: 50px;
  text-align: center;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* === INPUT BAR === */
.cdUser011011-input-wrapper {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.cdUser011011-input-container {
  display: flex;
  gap: 8px;
}

.cdUser011011-message-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  outline: none;
  font-size: 14px;
}

.cdUser011011-message-input:focus {
  border-color: #14b8a6;
}

.cdUser011011-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #14b8a6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cdUser011011-send-btn:disabled {
  opacity: 0.4;
}
</style>
