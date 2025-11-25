<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
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
const chatContainerRef = ref(null)

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

const sessionId = getUserId(cleanWebsite)

// Save messages locally
const saveMessages = () => {
  if (!props.userId) return
  localStorage.setItem(
    `chatMessages_${props.userId}`,
    JSON.stringify({ timestamp: Date.now(), chatMessages: chatMessages.value }),
  )
}

// Fetch messages from backend
const getMessage = async () => {
  if (!cleanWebsite) return
  try {
    loading.value = true
    const response = await axios.get(
      `https://assitance.storehive.com.ng/public/api/chat/admin/session/${sessionId}`,
      { params: { website: props.website } },
    )
    chatMessages.value = response.data.data?.messages || []
    await nextTick()
    scrollToBottom()
    saveMessages()
  } catch (error) {
    console.error('Failed to fetch messages:', error)
  } finally {
    loading.value = false
  }
}

// Scroll to bottom
const scrollToBottom = () => {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTo({
      top: chatContainerRef.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

// Add a message locally
const addMessage = (msg) => {
  chatMessages.value.push(msg)
  saveMessages()
  nextTick().then(scrollToBottom)
}

// Send a new message
const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageToSend = newMessage.value.trim()

  // Show locally instantly
  addMessage({
    sender: 'user',
    message: messageToSend,
    timestamp: Date.now(),
  })
  newMessage.value = ''

  try {
    sending.value = true
    await axios.post('https://assitance.storehive.com.ng/public/api/chat/admin/message', {
      session_id: sessionId,
      message: messageToSend,
      website: props.website,
      sender_type: 'user',
    })

    // Fetch messages right away to get admin replies
    await new Promise((resolve) => setTimeout(resolve, 500)) // optional small delay
    await getMessage()
  } catch (err) {
    console.error(err)
    // fallback: keep user message locally
    addMessage({
      sender: 'user',
      message: messageToSend,
      timestamp: Date.now(),
    })
  } finally {
    sending.value = false
  }
}

// Polling for new admin messages every 5 seconds
let pollInterval
onMounted(async () => {
  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 24 * 60 * 60 * 1000

  if (stored) {
    const data = JSON.parse(stored)
    if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
      localStorage.removeItem(`chatMessages_${props.userId}`)
      await getMessage()
    } else {
      chatMessages.value = data.chatMessages
      await nextTick()
      scrollToBottom()
      // Fetch fresh messages immediately
      await getMessage()
    }
  } else {
    await getMessage()
  }

  // Start polling
  pollInterval = setInterval(getMessage, 5000)
})

onBeforeUnmount(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
