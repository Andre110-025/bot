<script setup>
import { ref, computed, reactive } from 'vue'
import LoadingAnime from './LoadingAnime.vue'

const props = defineProps({
  primaryColor: {
    type: String,
  },
})

const customStyles = computed(() => ({
  '--primary-color': props.primaryColor,
}))

const emit = defineEmits(['form-complete'])

const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  phone: '',
})

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailValid = computed(() => {
  return emailRegex.test(form.email.trim())
})

const isFormValid = computed(() => {
  return form.name.trim() !== '' && isEmailValid.value && form.phone.length >= 10
})

const handleForm = () => {
  if (!isFormValid.value) return

  loading.value = true

  setTimeout(() => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    // console.log('Generated token:', token)

    const expiresAt = Date.now() + 1 * 24 * 60 * 60 * 1000

    localStorage.setItem('chatUser', JSON.stringify({ ...form, token, expiresAt }))
    loading.value = false
    emit('form-complete')
  }, 3000)
}
</script>

<template>
  <div class="cdUser011011-container">
    <div class="cdUser011011-card">
      <h2 class="cdUser011011-title">
        <svg
          class="cdUser011011-title-svg"
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient id="cdUser011011Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--primary-color)" />
              <stop offset="100%" stop-color="var(--primary-color)" />
            </linearGradient>
          </defs>

          <path
            fill="url(#cdUser011011Gradient)"
            d="M22.62 3.783c-1.115-1.811-4.355-2.604-6.713-.265c-.132.135-.306.548.218 1.104c1.097 1.149 6.819 7.046 4.702 12.196c-1.028 2.504-3.953 2.073-5.052-2.076a23.2 23.2 0 0 1-.473-9.367s.105-.394-.065-.52c-.117-.087-.305-.05-.547.33c-.06.096-.048.076-.106.178l-.003.002c-1.622 2.688-3.272 5.874-4.049 7.07c.38-1.803-.101-4.283-.85-6.359l-.142-.375c-.692-1.776-1.524-2.974-1.776-3.245c-.03-.033-.105-.094-.353-.094H.398c-.49 0-.448.412-.293.561c1.862 2.178 7.289 10.343 4.773 18.355c-.194.619.11.944.612.305c2.206-2.81 4.942-7.598 6.925-11.187c-.437 1.245-.822 2.63-1.028 4.083c-.435 3.064.487 5.37 1.162 6.58c.345.619.803.998 1.988.824c6.045-.885 8.06-6.117 8.805-8.77c1.357-4.839.363-7.568-.722-9.33"
          />
        </svg>

        <span>elcome</span>
      </h2>
      <p class="cdUser011011-subtitle">Please provide your info to start chatting with us</p>

      <form @submit.prevent="handleForm" class="cdUser011011-form">
        <div class="cdUser011011-input-group">
          <label>Full Name</label>
          <input v-model="form.name" type="text" :style="customStyles" />
        </div>

        <div class="cdUser011011-input-group">
          <label>Email Address</label>
          <input v-model="form.email" type="email" :style="customStyles" />
        </div>

        <div class="cdUser011011-input-group">
          <label>Phone Number</label>
          <input v-model="form.phone" type="tel" :style="customStyles" />
        </div>

        <button type="submit" :disabled="!isFormValid || loading" class="cdUser011011-btn">
          <LoadingAnime v-if="loading" />
          <span v-if="!loading">Start Chat</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Reset box-sizing for this component */
.cdUser011011-container *,
.cdUser011011-container *::before,
.cdUser011011-container *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cdUser011011-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 16px;
  width: 100%;
}

.cdUser011011-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.cdUser011011-title {
  text-align: center;
  font-size: 1.5rem;
  color: #111827;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1.2;
}

.cdUser011011-title span {
  margin: 0;
  padding: 0;
}

.cdUser011011-title-svg {
  display: block;
  flex-shrink: 0;
}

.cdUser011011-subtitle {
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 24px 0;
  padding: 0;
  line-height: 1.4;
}

.cdUser011011-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
}

.cdUser011011-input-group {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.cdUser011011-input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin: 0 0 6px 0;
  padding: 0;
  line-height: 1.2;
}

.cdUser011011-input-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0;
  background: #fff;
}

.cdUser011011-input-group input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
.cdUser011011-Gradient {
  color: var(--primary-color);
}
.cdUser011011-btn {
  background: var(--primary-color);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.1s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0 0;
  min-height: 44px;
}

.cdUser011011-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.cdUser011011-btn:active:not(:disabled) {
  transform: translateY(0);
}

.cdUser011011-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<script setup>
// Replace your clearAllExpiredSessions function with this:
const clearAllExpiredSessions = () => {
  const now = Date.now()

  // Clean up ALL expired sessions at once
  const keysToCheck = [
    'chatUser',
    'adminMode',
    ...Object.keys(localStorage).filter(
      (key) => key.startsWith('messages_') || key.startsWith('chatMessages_'),
    ),
  ]

  keysToCheck.forEach((key) => {
    try {
      const item = localStorage.getItem(key)
      if (!item) return

      const data = JSON.parse(item)

      // Check if item has expiresAt and it's expired
      if (data.expiresAt && now > data.expiresAt) {
        localStorage.removeItem(key)
        console.log(`🧹 Removed expired: ${key}`)

        // If removing adminMode, also clear the UI state
        if (key === 'adminMode') {
          showUserBotChat.value = true
        }
      }

      // Also check for messages with old timestamp (24h old)
      if (data.timestamp && now - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key)
        console.log(`🧹 Removed old messages: ${key}`)
      }
    } catch (error) {
      // If JSON parsing fails, remove corrupted data
      console.log(`🧹 Removing corrupted data: ${key}`)
      localStorage.removeItem(key)
    }
  })
}

// Update your onMounted to this:
onMounted(() => {
  // 1. Clear expired sessions FIRST
  clearAllExpiredSessions()

  // 2. Get user ID
  userId.value = getUserId(props.website)
  console.log('UserID:', userId.value)

  // 3. Check if user is logged in (chatUser exists and is valid)
  const storedUser = localStorage.getItem('chatUser')
  showChat.value = false

  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser)
      if (Date.now() <= userData.expiresAt) {
        showChat.value = true
      } else {
        // Remove expired chatUser
        localStorage.removeItem('chatUser')
      }
    } catch {
      localStorage.removeItem('chatUser')
    }
  }

  // 4. Check admin mode - IMPORTANT FIX HERE
  const adminMode = localStorage.getItem('adminMode')
  if (adminMode) {
    try {
      const adminData = JSON.parse(adminMode)
      if (Date.now() <= adminData.expiresAt) {
        showUserBotChat.value = false
      } else {
        // Admin session expired, remove and show bot chat
        localStorage.removeItem('adminMode')
        showUserBotChat.value = true
      }
    } catch {
      localStorage.removeItem('adminMode')
      showUserBotChat.value = true
    }
  } else {
    showUserBotChat.value = true
  }

  // 5. Load bot messages if any exist
  const storedMessages = localStorage.getItem(`messages_${userId.value}`)
  if (storedMessages) {
    try {
      const data = JSON.parse(storedMessages)
      messages.value = data.messages || [
        { text: "Hey there, I'm Chatbot convo. How can I help you today?", sender: 'AI' },
      ]
    } catch {
      messages.value = [
        { text: "Hey there, I'm Chatbot convo. How can I help you today?", sender: 'AI' },
      ]
    }
  }

  // 6. Show bubble after delay
  setTimeout(() => {
    showBubble.value = true
  }, 3000)

  // 7. Fetch customization
  getCustomization()
})

// Also update the AdminChatSection's onMounted to clear expired sessions properly:
// In your AdminChatSection component, update the onMounted to this:
onMounted(async () => {
  // Check if session is expired BEFORE loading anything
  const adminMode = localStorage.getItem('adminMode')
  if (!adminMode) {
    // No admin mode, go back to bot chat
    emit('session-expired')
    return
  }

  try {
    const adminData = JSON.parse(adminMode)
    if (Date.now() > adminData.expiresAt) {
      localStorage.removeItem('adminMode')
      emit('session-expired')
      return
    }
  } catch {
    localStorage.removeItem('adminMode')
    emit('session-expired')
    return
  }

  // Rest of your existing onMounted code...
  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 1 * 24 * 60 * 60 * 1000

  if (stored) {
    const data = JSON.parse(stored)
    if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
      localStorage.removeItem(`chatMessages_${props.userId}`)
      localStorage.removeItem('adminMode')
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
</script>
