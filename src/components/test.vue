<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import getUserId from './components/utils/userId'
import SignInForm from './components/SignInForm.vue'
import AdminChatSection from './components/AdminChatSection.vue'

const showPopup = ref(false)
const userInput = ref('')
const messages = ref([{ text: 'Hey there, I’m NexDre. How can I help you today?', sender: 'AI' }])
const typingMessageIndex = ref(-1)
const displayedTexts = ref({})
const chatContainer = ref(null)
const charTimers = {} // now per-message timer
const lastUserMessage = ref('')
const showUserBotChat = ref(true)
const adminMessages = ref([])
let userId = localStorage.getItem('userId')

if (!userId) {
  userId = getUserId()
  localStorage.setItem('userId', userId)
}

const togglePopup = () => {
  showPopup.value = !showPopup.value
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// safe typing animation
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
      clearTimeout(charTimers[index])
      delete charTimers[index]
    }
  }
  step()
}

// send user message
const sendMessage = async () => {
  if (!userInput.value.trim()) return
  const userText = userInput.value.trim()
  messages.value.push({ text: userText, sender: 'user' })
  userInput.value = ''
  await scrollToBottom()
  await getResponse(userText)
}

// AI response
const getResponse = async (inputText) => {
  try {
    // push placeholder for AI message
    messages.value.push({ sender: 'AI', isThinking: true })
    const aiIndex = messages.value.length - 1 // FIXED index
    await scrollToBottom()

    let reply = await getGeminiResponse(inputText)

    // fallback if backend shape is weird
    if (!reply || typeof reply !== 'string') {
      reply = 'Oops! Something went wrong. Check internet connection and try again.'
    }

    // update AI message
    messages.value[aiIndex].isThinking = false
    messages.value[aiIndex].text = reply
    await scrollToBottom()

    // typing animation
    typeMessage(aiIndex, reply)

    // admin fallback button if unsure
    if (reply === 'I’m not sure, the admin will get back to you.') {
      lastUserMessage.value = inputText
      setTimeout(() => {
        messages.value.push({
          sender: 'AI',
          isButton: true,
        })
        scrollToBottom()
      }, 1200)
    }
  } catch (err) {
    console.error('API error:', err)
    messages.value.push({ text: 'Oops, something went wrong.', sender: 'AI' })
  } finally {
    await scrollToBottom()
  }
}

// backend call
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

// admin redirect
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

// cleanup timers on unmount
onBeforeUnmount(() => {
  Object.values(charTimers).forEach((t) => clearTimeout(t))
})

// src/main.js
import { defineCustomElement } from 'vue'
import AppVue from './App.vue'

// Your existing component imports...
import SignInForm from './components/SignInForm.vue'
import AdminChatSection from './components/AdminChatSection.vue'
// ...etc

// Convert them if you want
const SignInElement = defineCustomElement(SignInForm)
const AdminChatElement = defineCustomElement(AdminChatSection)
customElements.define('sign-in-form', SignInElement)
customElements.define('admin-chat-section', AdminChatElement)

// THE FIX – add this block:
const ChatbotElement = defineCustomElement(AppVue, {
  // This keeps the shadow DOM (perfect isolation)
  // BUT also injects all <style> tags into <head> so you can actually see them immediately
  styles: AppVue.styles, // ← THIS IS THE MAGIC LINE
})

const CUSTOM_TAG_NAME = 'chatbot-widget'
if (!customElements.get(CUSTOM_TAG_NAME)) {
  customElements.define(CUSTOM_TAG_NAME, ChatbotElement)
  console.log(`Chatbot registered as <${CUSTOM_TAG_NAME}>`)
}
</script>
