<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import getUserId from './components/utils/userId'
import SignInForm from './components/SignInForm.vue'
import AdminChatSection from './components/AdminChatSection.vue'

// ---- State ----
const showPopup = ref(false)
const userInput = ref('')
const messages = ref([{ text: 'Hey there, I’m NexDre. How can I help you today?', sender: 'AI' }])
const typingMessageIndex = ref(-1)
const displayedTexts = ref({})
const chatContainer = ref(null)
const charTimers = {} // per-message typing timers
const lastUserMessage = ref('')
const showUserBotChat = ref(true)

let userId = localStorage.getItem('userId')
if (!userId) {
  userId = getUserId()
  localStorage.setItem('userId', userId)
}

// ---- Helpers ----
const togglePopup = () => {
  showPopup.value = !showPopup.value
}

// scroll to bottom safely
const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// save messages to localStorage
const saveMessages = () => {
  if (!userId) return
  localStorage.setItem(`messages_${userId}`, JSON.stringify(messages.value))
}

// central addMessage function
const addMessage = (msg) => {
  messages.value.push(msg)
  saveMessages()
}

// typing animation for AI messages
const typeMessage = (index, fullText) => {
  let i = 0
  displayedTexts.value[index] = ''
  typingMessageIndex.value = index

  const msPerChar = 30 + Math.random() * 20

  const step = () => {
    if (i < fullText.length) {
      displayedTexts.value[index] = fullText.slice(0, ++i)
      charTimers[index] = setTimeout(step, msPerChar)
    } else {
      typingMessageIndex.value = -1
      messages.value[index].text = fullText
      clearTimeout(charTimers[index])
      delete charTimers[index]
      saveMessages() // save final typed AI message
    }
  }
  step()
}

// ---- Chat Flow ----
const sendMessage = async () => {
  if (!userInput.value.trim()) return
  const userText = userInput.value.trim()

  addMessage({ text: userText, sender: 'user', createdAt: Date.now() })
  lastUserMessage.value = userText
  userInput.value = ''
  await scrollToBottom()

  await getResponse(userText)
}

const getResponse = async (inputText) => {
  try {
    addMessage({ sender: 'AI', isThinking: true }) // placeholder
    const aiIndex = messages.value.length - 1
    await scrollToBottom()

    let reply = await getGeminiResponse(inputText)

    if (!reply || typeof reply !== 'string') {
      reply = 'Oops! Something went wrong. Check internet connection and try again.'
    }

    // set AI message
    messages.value[aiIndex].isThinking = false
    messages.value[aiIndex].text = reply
    await scrollToBottom()

    // typing animation
    typeMessage(aiIndex, reply)

    // fallback button (example)
    if (reply === 'I’m not sure, the admin will get back to you.') {
      setTimeout(() => {
        addMessage({ sender: 'AI', isButton: true })
        scrollToBottom()
      }, 1200)
    }
  } catch (err) {
    console.error('API error:', err)
    addMessage({ text: 'Oops, something went wrong.', sender: 'AI' })
  } finally {
    await scrollToBottom()
  }
}

// ---- API Call ----
async function getGeminiResponse(userText) {
  try {
    const response = await axios.post(
      'https://assitance.storehive.com.ng/public/api/chat/message',
      {
        message: userText,
        conversation_id: userId,
        website: 'https://dre-hotels.com',
        api: 'pk_217KqhczTRcWw5tvXCBcvCrxT5P30A3CkrBz8KDXQnk',
      },
    )
    return response.data.text
  } catch (err) {
    console.error('Error calling Gemini API:', err)
    return 'Oops! Something went wrong. Check internet connection and try again.'
  }
}

// ---- Admin redirect ----
const sendToAdmin = async () => {
  showUserBotChat.value = false
  try {
    await axios.post('http://localhost:3000/api/admin/repost', {
      userId,
      userText: lastUserMessage.value,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
  }
}

// ---- Mount ----
onMounted(() => {
  // restore messages
  const storedMessages = localStorage.getItem(`messages_${userId}`)
  if (storedMessages) messages.value = JSON.parse(storedMessages)
})

// ---- Cleanup ----
onBeforeUnmount(() => {
  Object.values(charTimers).forEach((t) => clearTimeout(t))
})

import { ref, onMounted } from 'vue'

const showChat = ref(false)

onMounted(() => {
  const saved = JSON.parse(localStorage.getItem('chatUser'))

  if (!saved) return

  if (Date.now() > saved.expiresAt) {
    // expired
    localStorage.removeItem('chatUser')
    showChat.value = false
  } else {
    // still valid
    showChat.value = true
  }
})
</script>

<script setup>
import { ref, nextTick } from 'vue'
import axios from 'axios'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sending = ref(false)
const chatMessages = ref([])
const newMessage = ref('')

const stored = localStorage.getItem('chatUser')
const data = stored ? JSON.parse(stored) : null
const userEmail = data?.email || 'guest@example.com'

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = ''

  // Add message locally for instant feedback
  chatMessages.value.push({
    sender: 'user',
    text: messageToSend,
    timestamp: Date.now(),
  })
  await nextTick()
  scrollToBottom()

  try {
    sending.value = true
    await axios.post('https://assitance.storehive.com.ng/public/api/chat/message', {
      conversation_id: props.userId + cleanWebsite,
      message: messageToSend,
      website: props.website,
      api: props.api,
      user_email: userEmail,
      start_admin_chat: true,
    })
  } catch (err) {
    console.error(err)
    // On error, show message again
    chatMessages.value.push({
      sender: 'user',
      text: messageToSend,
      timestamp: Date.now(),
    })
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
</script>

<template>
  <div class="cdUser011011-chat-container">
    <div class="cdUser011011-chat-header">
      <div class="cdUser011011-header-content">
        <div class="cdUser011011-status-indicator">
          <div class="cdUser011011-status-dot"></div>
          <span>Admin</span>
        </div>
      </div>
    </div>

    <div class="cdUser011011-messages-wrapper">
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="cdUser011011-message-row"
          :class="msg.sender"
        >
          <div class="cdUser011011-message-content">
            <div class="cdUser011011-bubble-wrapper">
              <div class="cdUser011011-message-bubble" :class="`cdUser011011-bubble-${msg.sender}`">
                <p class="cdUser011011-message-text">{{ msg.text }}</p>
              </div>
              <span class="cdUser011011-message-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
        </div>
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
