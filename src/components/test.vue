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
