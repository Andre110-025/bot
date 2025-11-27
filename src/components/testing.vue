<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import axios from 'axios'
import getUserId from './utils/userId'
import { useAbly } from '../composables/userAbly'
import { useTypingIndicator } from '../composables/useTypingIndicator' // 👈 Same composable

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sending = ref(false)
const chatMessages = ref([])
const newMessage = ref('')

// Initialize Ably with alias
const {
  initializeAbly,
  onAdminReply,
  isConnected,
  disconnect: disconnectAbly, // 👈 Alias for Ably disconnect
} = useAbly()

// Initialize Typing with alias
const {
  isTyping: isSomeoneTyping,
  typingUsers,
  initializeTyping,
  startTyping,
  disconnect: disconnectTyping, // 👈 Alias for typing disconnect
} = useTypingIndicator()

let unsubscribeFromAbly = () => {}
let typingTimeout = null

const sessionId = getUserId(cleanWebsite)

// Typing handler
const handleTyping = () => {
  startTyping()
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {}, 1000)
}

// Enhanced status text
const statusText = computed(() => {
  if (!isConnected.value) return 'Connecting...'
  if (isSomeoneTyping.value && typingUsers.value.length > 0) {
    const users = typingUsers.value.join(' and ')
    return `${users} ${typingUsers.value.length === 1 ? 'is' : 'are'} typing...`
  }
  return 'Online'
})

onMounted(async () => {
  // Your existing initialization code...

  const isAblyInitialized = await initializeAbly()
  if (isAblyInitialized) {
    unsubscribeFromAbly = onAdminReply(sessionId, handleAdminReply)

    // Initialize typing with session-specific room
    await initializeTyping(window.ablyInstance, `chat-${sessionId}`)
  }
})

// 👇 CLEANUP - Same pattern as admin side
onBeforeUnmount(() => {
  unsubscribeFromAbly()
  disconnectAbly() // 👈 Disconnect Ably
  disconnectTyping() // 👈 Disconnect typing
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
})
</script>

<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-left">
        <div class="status-dot" :class="{ active: isConnected }"></div>
        <span class="header-title">Support Chat</span>
      </div>
      <!-- 👇 Typing status -->
      <span class="status-text">{{ statusText }}</span>
    </div>

    <div class="messages-wrapper">
      <div ref="chatContainerRef" class="messages-container">
        <!-- Your existing messages... -->

        <!-- 👇 Typing indicator bubble -->
        <div v-if="isSomeoneTyping && typingUsers.length > 0" class="message-row admin">
          <div class="message-bubble admin">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 👇 Input with typing detection -->
    <div class="input-wrapper">
      <input
        v-model="newMessage"
        @keydown="handleTyping"
        @keyup.enter="sendMessage"
        type="text"
        placeholder="Type a message..."
        :disabled="sending || !isConnected"
        class="message-input"
      />
      <!-- ... send button -->
    </div>
  </div>
</template>
