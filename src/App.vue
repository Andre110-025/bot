<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed, reactive, watch } from 'vue'
import axios from 'axios'
import SignInForm from './components/SignInForm.vue'
import AdminChatSection from './components/AdminChatSection.vue'
import getUserId from './components/utils/userId'

const showPopup = ref(false)
const userInput = ref('')
const messages = ref([{ text: 'Hey there, I’m NexDre. How can I help you today?', sender: 'AI' }])
const typingMessageIndex = ref(-1)
const displayedTexts = ref({})
const chatContainer = ref(null)
// let charTimer = null
const charTimers = {}
const lastUserMessage = ref('')
const showUserBotChat = ref(true)
const adminMessages = ref([])
let userId = localStorage.getItem('userId')

const props = defineProps({
  website: {
    type: String,
    required: true,
    default: 'N/A',
  },
  api: {
    type: String,
    required: true,
    default: 'N/A',
  },
})

if (!userId) {
  userId = getUserId()
  localStorage.setItem('userId', userId)
}

const togglePopup = () => {
  showPopup.value = !showPopup.value
}

// const scrollToBottom = async () => {
//   await nextTick()
//   setTimeout(() => {
//     if (chatContainer.value) {
//       chatContainer.value.scrollTop = chatContainer.value.scrollHeight
//     }
//   }, 50)
// }

const scrollToBottom = () => {
  nextTick(() => {
    const el = chatContainer.value
    if (!el) return // 1. Find the inner container that holds all the message elements.

    const messagesContainer = el.querySelector('.cdUser011011-messages-container') // If the Admin Chat is showing, messagesContainer might not exist, so we stop.

    if (!messagesContainer) return // 2. The element we want to scroll into view is the last message row

    const lastMsg = messagesContainer.lastElementChild

    if (lastMsg) {
      // Use scrollIntoView on the actual last message element for best accuracy
      lastMsg.scrollIntoView({ behavior: 'smooth', block: 'end' })
    } else {
      // Fallback: If no message elements are found, scroll the container all the way down.
      el.scrollTop = el.scrollHeight
    }
  })
}

// watch(
//   messages,
//   async () => {
//     await nextTick()
//     if (chatContainer.value) {
//       chatContainer.value.scrollTop = chatContainer.value.scrollHeight
//     }
//   },
//   { deep: true },
// )

watch(messages, scrollToBottom, { deep: true })
watch(displayedTexts, scrollToBottom, { deep: true })

const typeMessage = (index, fullText) => {
  return new Promise((resolve) => {
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
        resolve() // <-- typing finished
      }
    }
    step()
  })
}

const sendMessage = async () => {
  if (!userInput.value.trim()) return
  const userText = userInput.value.trim()
  messages.value.push({ text: userText, sender: 'user' })
  userInput.value = ''
  scrollToBottom()
  await getResponse(userText)
}

const getResponse = async (inputText) => {
  try {
    messages.value.push({ sender: 'AI', isThinking: true })
    const aiIndex = messages.value.length - 1
    scrollToBottom()

    let reply = await getGeminiResponse(inputText)

    if (!reply || typeof reply !== 'string') {
      reply = 'Oops! Something went wrong. Check internet connection and try again.'
    }

    messages.value[aiIndex] = {
      sender: 'AI',
      text: '',
      isThinking: false,
    }

    scrollToBottom()

    await typeMessage(aiIndex, reply)

    const terms = [
      'contact support for more information.',
      'contact support team',
      'contact support',
      'please contact support for more details',
      'support team',
      'contacting support',
      'What specific information are you looking for?',
      'please let me know',
    ]

    const shouldShowButton = terms.some((term) => reply.toLowerCase().includes(term.toLowerCase()))

    if (shouldShowButton) {
      lastUserMessage.value = inputText

      messages.value.push({
        sender: 'AI',
        isButton: true,
      })

      scrollToBottom()
    }
  } catch (err) {
    console.error('API error:', err)
    messages.value.push({
      text: 'Oops, something went wrong.',
      sender: 'AI',
    })
  } finally {
    scrollToBottom()
  }
}

async function getGeminiResponse(userText) {
  try {
    const response = await axios.post(
      'https://assitance.storehive.com.ng/public/api/chat/message',
      {
        message: userText,
        conversation_id: userId,
        website: props.website,
        api: props.api,
      },
    )
    console.log(response)
    return response.data.data.response
  } catch (err) {
    console.error('Error calling Gemini API:', err)
    return 'Oops! Something went wrong. Check internet connection and try again'
  }
}

const showBubble = ref(false)

onMounted(() => {
  setTimeout(() => {
    showBubble.value = true
  }, 3000)
})

const showChat = ref(false)

onMounted(() => {
  const storedUser = localStorage.getItem('chatUser')

  if (storedUser) {
    const data = JSON.parse(storedUser)

    if (Date.now() > data.expiresAt) {
      // console.log('Token expired — clearing data')
      localStorage.removeItem('chatUser')
      showChat.value = false
    } else {
      // console.log('Valid token — skip form')
      showChat.value = true
    }
  } else {
    showChat.value = false
  }
})

const handleFormComplete = () => {
  showChat.value = true
}

const handleAdminRedirect = () => {
  showUserBotChat.value = false
}

const sendToAdmin = async () => {
  showUserBotChat.value = false
  try {
    await axios.post('http://localhost:3000/api/admin/repost', {
      userId: userId,
      userText: lastUserMessage.value,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
  }
}

onBeforeUnmount(() => {
  Object.values(charTimers).forEach((t) => clearTimeout(t))
})
</script>

<template>
  <div class="cdUser011011-wrapper" v-if="showBubble">
    <div class="cdUser011011-chatbot">
      <div class="cdUser011011-inner">
        <div class="cdUser011011-bubble" @click="togglePopup">
          <svg xmlns="http://www.w3.org/2000/svg" class="cdUser011011-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M2 22V9q0-.825.588-1.413Q3.175 7 4 7h2V4q0-.825.588-1.413Q7.175 2 8 2h12q.825 0 1.413.587Q22 3.175 22 4v8q0 .825-.587 1.412Q20.825 14 20 14h-2v3q0 .825-.587 1.413Q16.825 19 16 19H5Zm6-10h8V9H8Zm-4 5h12v-3H8q-.825 0-1.412-.588Q6 12.825 6 12V9H4Zm14-5h2V4H8v3h8q.825 0 1.413.587Q18 8.175 18 9Z"
            />
          </svg>
          <span class="cdUser011011-ping"></span>
          <span class="cdUser011011-ping-static"></span>
        </div>

        <transition name="cdUser011011-fade">
          <div v-if="showPopup" class="cdUser011011-popup">
            <header class="cdUser011011-header">
              <div class="cdUser011011-header-left">
                <div class="cdUser011011-avatar">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M1 18q.225-2.675 1.638-4.925T6.4 9.5L4.55 6.3q-.15-.225-.075-.475T4.8 5.45q.2-.125.45-.05t.4.3L7.5 8.9Q9.65 8 12 8t4.5.9l1.85-3.2q.15-.225.4-.3t.45.05q.25.125.325.375t-.075.475L17.6 9.5q2.35 1.325 3.762 3.575T23 18zm6-2.75q.525 0 .888-.363T8.25 14t-.363-.888T7 12.75t-.888.363T5.75 14t.363.888t.887.362m10 0q.525 0 .888-.363T18.25 14t-.363-.888T17 12.75t-.888.363t-.362.887t.363.888t.887.362"
                    />
                  </svg>
                </div>
                <div>
                  <h2 class="cdUser011011-title">
                    Chat<span class="cdUser011011-title-highlight">Bot</span>
                  </h2>
                  <p class="cdUser011011-subtitle">Your AI assistant, ready to help</p>
                </div>
              </div>
              <button class="cdUser011011-close" @click="togglePopup">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"
                  />
                </svg>
              </button>
            </header>

            <SignInForm v-if="!showChat" @form-complete="handleFormComplete" />

            <section v-else ref="chatContainer" class="cdUser011011-body">
              <div v-if="showUserBotChat" class="cdUser011011-messages-container">
                <div
                  v-for="(msg, index) in messages"
                  :key="index"
                  class="cdUser011011-message-row"
                  :class="
                    msg.sender === 'AI' ? 'cdUser011011-message-left' : 'cdUser011011-message-right'
                  "
                >
                  <template v-if="msg.sender === 'AI'">
                    <div class="cdUser011011-avatar-bot">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M1 18q.225-2.675 1.638-4.925T6.4 9.5L4.55 6.3q-.15-.225-.075-.475T4.8 5.45q.2-.125.45-.05t.4.3L7.5 8.9Q9.65 8 12 8t4.5.9l1.85-3.2q.15-.225.4-.3t.45.05q.25.125.325.375t-.075.475L17.6 9.5q2.35 1.325 3.762 3.575T23 18zm6-2.75q.525 0 .888-.363T8.25 14t-.363-.888T7 12.75t-.888.363T5.75 14t.363.888t.887.362m10 0q.525 0 .888-.363T18.25 14t-.363-.888T17 12.75t-.888.363t-.362.887t.363.888t.887.362"
                        />
                      </svg>
                    </div>

                    <div v-if="!msg.isButton" class="cdUser011011-message bot">
                      <span v-if="msg.isThinking" class="cdUser011011-typing-indicator">
                        <span class="cdUser011011-typing-dot"></span>
                        <span class="cdUser011011-typing-dot"></span>
                        <span class="cdUser011011-typing-dot"></span>
                      </span>
                      <span v-else-if="typingMessageIndex === index">
                        {{ displayedTexts[index] || '' }}
                      </span>
                      <span v-else>{{ msg.text }}</span>
                    </div>

                    <div v-else class="cdUser011011-message bot">
                      <button class="cdUser011011-fallback-btn" @click="sendToAdmin">
                        Talk to Admin
                      </button>
                    </div>
                  </template>

                  <template v-else>
                    <div class="cdUser011011-message user">{{ msg.text }}</div>
                    <div class="cdUser011011-avatar-user">
                      <svg
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
                  </template>
                </div>
              </div>

              <AdminChatSection v-else :userId="userId" />
            </section>

            <footer class="cdUser011011-footer">
              <div class="cdUser011011-footer-main" v-if="showUserBotChat">
                <div class="cdUser011011-input-wrapper">
                  <input
                    v-model="userInput"
                    @keyup.enter="sendMessage"
                    type="text"
                    placeholder="Type your message..."
                    class="cdUser011011-footer-input"
                  />
                  <button class="cdUser011011-footer-send" @click="sendMessage">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                    >
                      <path fill="currentColor" d="M3 20v-6l8-2l-8-2V4l19 8z" />
                    </svg>
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style>
.cdUser011011-wrapper {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.cdUser011011-wrapper *,
.cdUser011011-wrapper *::before,
.cdUser011011-wrapper *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* === Floating Bubble === */
.cdUser011011-bubble {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 8px 24px rgba(16, 185, 129, 0.2);
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cdUser011011-bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  margin: 0;
  padding: 0;
}

.cdUser011011-bubble:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow:
    0 6px 16px rgba(16, 185, 129, 0.4),
    0 12px 32px rgba(16, 185, 129, 0.25);
}

.cdUser011011-bubble:active {
  transform: scale(0.95);
}

.cdUser011011-icon {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  display: block;
}

/* Ping Animation */
.cdUser011011-ping,
.cdUser011011-ping-static {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  background: #34d399;
  border-radius: 50%;
  border: 2px solid #fff;
  margin: 0;
  padding: 0;
}

.cdUser011011-ping {
  animation: cdUser011011-pingAnim 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.cdUser011011-ping-static {
  box-shadow: 0 0 4px rgba(52, 211, 153, 0.6);
}

@keyframes cdUser011011-pingAnim {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  75%,
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes cdUser011011-bounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* === Chat Popup === */
.cdUser011011-popup {
  position: absolute;
  bottom: 84px;
  right: 0;
  width: 400px;
  height: 600px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 10px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  margin: 0;
  padding: 0;
}

/* === Header === */
.cdUser011011-header {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.cdUser011011-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.cdUser011011-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

.cdUser011011-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  padding: 0;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin-right: 100px;
}

.cdUser011011-title-highlight {
  color: #d1fae5;
  font-weight: 800;
}

.cdUser011011-subtitle {
  font-size: 0.75rem;
  margin: 2px 0 0 0;
  padding: 0;
  opacity: 0.9;
  font-weight: 400;
  line-height: 1.2;
  color: white;
}

.cdUser011011-close {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.cdUser011011-close:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(90deg);
}

/* === Body / Messages === */
.cdUser011011-body {
  background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem 1rem;
  scroll-behavior: smooth;
  margin: 0;
  min-height: 0; /* Important for flex children */
}

.cdUser011011-body::-webkit-scrollbar {
  width: 6px;
}

.cdUser011011-body::-webkit-scrollbar-track {
  background: transparent;
}

.cdUser011011-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

.cdUser011011-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.cdUser011011-messages-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
}

.cdUser011011-message-row {
  display: flex;
  align-items: flex-end;
  animation: cdUser011011-messageSlide 0.3s ease;
  margin: 0;
  padding: 0;
}

@keyframes cdUser011011-messageSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cdUser011011-message-left {
  justify-content: flex-start;
}

.cdUser011011-message-right {
  justify-content: flex-end;
}

/* === Avatars === */
.cdUser011011-avatar-bot,
.cdUser011011-avatar-user {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  padding: 0;
}

.cdUser011011-avatar-bot {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  color: #fff;
  margin: 0 10px 0 0;
}

.cdUser011011-avatar-user {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  margin: 0 0 0 10px;
}

/* === Message Bubbles === */
.cdUser011011-message {
  padding: 0.875rem 1.125rem;
  border-radius: 16px;
  font-size: 0.9375rem;
  line-height: 1.5;
  max-width: 75%;
  word-wrap: break-word;
  word-break: break-word;
  position: relative;
  animation: cdUser011011-messagePop 0.2s ease;
  margin: 0;
}

@keyframes cdUser011011-messagePop {
  0% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

.cdUser011011-message.bot {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  color: #ffffff;
  border-bottom-left-radius: 4px;
  box-shadow:
    0 2px 8px rgba(17, 24, 39, 0.15),
    0 1px 3px rgba(17, 24, 39, 0.1);
}

.cdUser011011-message.user {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border-bottom-right-radius: 4px;
  box-shadow:
    0 2px 8px rgba(16, 185, 129, 0.25),
    0 1px 3px rgba(16, 185, 129, 0.15);
}

/* === Typing Indicator === */
.cdUser011011-typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  margin: 0;
}

.cdUser011011-typing-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: cdUser011011-typingBounce 1.4s infinite ease-in-out both;
  margin: 0;
  padding: 0;
}

.cdUser011011-typing-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.cdUser011011-typing-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes cdUser011011-typingBounce {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* === Empty State === */
.cdUser011011-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 1rem;
  margin: 0;
}

.cdUser011011-empty-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  margin: 0;
  padding: 0;
}

.cdUser011011-empty-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  padding: 0;
  line-height: 1.4;
}

.cdUser011011-empty-subtext {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
  padding: 0;
  line-height: 1.4;
}

/* === Footer === */
.cdUser011011-footer {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.cdUser011011-footer-main {
  padding: 0.75rem;
  margin: 0;
}

.cdUser011011-input-wrapper {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
}

.cdUser011011-footer-input {
  width: 100%;
  padding: 0.875rem 3.5rem 0.875rem 1rem;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
  background: #f9fafb;
  font-family: inherit;
  margin: 0;
  line-height: 1.5;
}

.cdUser011011-footer-input:focus {
  border-color: #10b981;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(16, 185, 129, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.05);
}

.cdUser011011-footer-input::placeholder {
  color: #9ca3af;
}

.cdUser011011-footer-send {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.cdUser011011-footer-send:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.cdUser011011-footer-send:active {
  transform: translateY(-50%) scale(0.95);
}

.cdUser011011-fallback-btn {
  background: white;
  color: #000;
  border: none;
  border-radius: 20px;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 0.9rem;
  margin: 6px 0 0 0;
  font-weight: 500;
  transition: all 0.3s ease;
  display: inline-block;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
}

.cdUser011011-fallback-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
  background: #fff;
}

/* === Toggle Buttons === */
.cdUser011011-toggle-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-top: 1px solid #e5e7eb;
  margin: 0;
}

.cdUser011011-toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.2s ease;
  font-family: inherit;
  margin: 0;
  line-height: 1.2;
}

.cdUser011011-toggle-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.cdUser011011-toggle-btn.cdUser011011-active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: #ffffff;
  box-shadow:
    0 2px 8px rgba(16, 185, 129, 0.25),
    0 1px 3px rgba(16, 185, 129, 0.15);
}

.cdUser011011-toggle-btn.cdUser011011-active:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 2px 6px rgba(16, 185, 129, 0.2);
}

.cdUser011011-toggle-btn svg {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

/* === Transitions === */
.cdUser011011-fade-enter-active {
  animation: cdUser011011-popupSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cdUser011011-fade-leave-active {
  animation: cdUser011011-popupSlideOut 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes cdUser011011-popupSlideIn {
  from {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes cdUser011011-popupSlideOut {
  from {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
}

/* === Responsive Design === */
@media (max-width: 480px) {
  .cdUser011011-wrapper {
    bottom: 1rem;
    right: 1rem;
  }

  .cdUser011011-popup {
    width: calc(100vw - 2rem);
    height: calc(100vh - 120px);
    max-width: 400px;
    max-height: 600px;
  }

  .cdUser011011-bubble {
    width: 56px;
    height: 56px;
  }

  .cdUser011011-icon {
    width: 26px;
    height: 26px;
  }
}

@media (max-height: 700px) {
  .cdUser011011-popup {
    height: 500px;
  }
}
</style>
