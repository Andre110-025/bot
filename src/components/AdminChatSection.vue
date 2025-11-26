// src/components/YourChatComponent.vue
<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import getUserId from './utils/userId'
import { useAbly } from '../composables/userAbly'

const props = defineProps({
  userId: { type: String, required: true },
  api: { type: String, required: true },
  website: { type: String, required: true },
})

const sending = ref(false)
const loading = ref(false)
const chatMessages = ref([])
const newMessage = ref('')

// Initialize Ably Composables
const { initializeAbly, onAdminReply, isConnected, disconnect } = useAbly()
let unsubscribeFromAbly = () => {} // Placeholder for the unsubscribe function

const cleanWebsite = props.website
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]

const saveMessages = () => {
  if (!props.userId) return
  const payload = {
    timestamp: Date.now(),
    chatMessages: chatMessages.value,
  }
  localStorage.setItem(`chatMessages_${props.userId}`, JSON.stringify(payload))
}

const sessionId = getUserId(cleanWebsite)
console.log('Session ID:', sessionId)

// Renamed and streamlined fetch
const fetchInitialMessages = async () => {
  if (!cleanWebsite) return
  try {
    loading.value = true // Using props.api for more flexibility, assuming it contains the base URL
    const url = `https://assitance.storehive.com.ng/public/api/chat/admin/session/${sessionId}`
    const response = await axios.get(url, {
      params: { website: props.website },
    }) // Ensure messages are properly formatted with sender types

    chatMessages.value = (response.data.data?.messages || []).map((msg) => {
      // Normalize sender type - assuming 'user' for current user, 'admin' for others
      const senderType = msg.sender_type === 'user' ? 'user' : 'admin'
      return {
        ...msg,
        sender: senderType, // Used for CSS alignment
      }
    })

    saveMessages()
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Failed to fetch session messages:', error)
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageToSend = newMessage.value.trim()
  newMessage.value = '' // Clear input immediately

  try {
    sending.value = true // Optimistically add user message to UI immediately

    const userMessage = {
      message: messageToSend,
      sender: 'user',
      sender_type: 'user',
      timestamp: new Date().toISOString(), // Add an ID for better keying, even if temporary
      id: Date.now() + Math.random(),
    }

    chatMessages.value.push(userMessage)
    saveMessages()
    await nextTick()
    scrollToBottom() // Post the message

    await axios.post('https://assitance.storehive.com.ng/public/api/chat/admin/message', {
      session_id: sessionId,
      message: messageToSend,
      website: props.website,
      sender_type: 'user',
    }) // --- Ably Improvement: NO need to call fetchInitialMessages() here!
    // The real-time subscription will handle admin replies.
    // Remove: await getMessage();
  } catch (err) {
    console.error('Message send failed:', err)
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

const getMessageAlignment = (msg) => {
  return msg.sender === 'user' || msg.sender_type === 'user' ? 'user' : 'admin'
}

const handleAdminReply = async (messageData) => {
  // Format the incoming admin message
  const adminMessage = {
    message: messageData.message,
    sender: 'admin',
    sender_type: 'admin',
    timestamp: messageData.timestamp || new Date().toISOString(),
    id: messageData.id || Date.now() + Math.random(),
  } // Add to the messages array

  chatMessages.value.push(adminMessage)
  saveMessages()
  await nextTick()
  scrollToBottom()
}

onMounted(async () => {
  const stored = localStorage.getItem(`chatMessages_${props.userId}`)
  const oneDay = 1 * 24 * 60 * 60 * 1000

  if (stored) {
    const data = JSON.parse(stored)
    if (!data.timestamp || Date.now() - data.timestamp > oneDay) {
      localStorage.removeItem(`chatMessages_${props.userId}`)
      await fetchInitialMessages()
    } else {
      chatMessages.value = data.chatMessages
      await nextTick()
      scrollToBottom() // Call fetch to get any missed messages since the last open, but without blocking
      setTimeout(() => {
        fetchInitialMessages()
      }, 1000)
    }
  } else {
    await fetchInitialMessages()
    await nextTick()
    scrollToBottom()
  } // 🚀 Ably Integration: Initialize and Subscribe

  const isAblyInitialized = await initializeAbly()
  if (isAblyInitialized) {
    // Subscribe to admin replies for this specific session ID
    unsubscribeFromAbly = onAdminReply(sessionId, handleAdminReply)
  }
})

onBeforeUnmount(() => {
  // Clean up Ably connection and subscription
  unsubscribeFromAbly()
  disconnect()
})
</script>

<template>
   
  <div class="cdUser011011-chat-container">
       
    <div class="cdUser011011-chat-header">
           
      <div class="cdUser011011-header-content">
               
        <div class="cdUser011011-status-indicator">
                             
          <div
            class="cdUser011011-status-dot"
            :class="{ 'is-connected': isConnected, 'is-connecting': !isConnected }"
          ></div>
                    <span>Admin Support ({{ isConnected ? 'Online' : 'Offline' }})</span>        
        </div>
             
      </div>
         
    </div>

       
    <div class="cdUser011011-messages-wrapper">
           
      <div ref="chatContainerRef" class="cdUser011011-messages-container">
                       
        <div
          v-for="(msg, i) in chatMessages"
          :key="msg.id || i"
          class="cdUser011011-message-row"
          :class="getMessageAlignment(msg)"
        >
                   
          <div class="cdUser011011-message-content">
                       
            <div
              class="cdUser011011-avatar"
              :class="`cdUser011011-avatar-${getMessageAlignment(msg)}`"
            >
                            <span v-if="getMessageAlignment(msg) === 'admin'">A</span>              
              <span v-else>Y</span>            
            </div>
                       
            <div class="cdUser011011-bubble-wrapper">
                           
              <div
                class="cdUser011011-message-bubble"
                :class="`cdUser011011-bubble-${getMessageAlignment(msg)}`"
              >
                               
                <p class="cdUser011011-message-text">{{ msg.message }}</p>
                             
              </div>
                           
              <span class="cdUser011011-message-time">{{ formatTime(msg.timestamp) }}</span>        
                 
            </div>
                     
          </div>
                 
        </div>
                               
        <div v-if="loading" class="cdUser011011-loading-state">
                   
          <div class="cdUser011011-typing-indicator">
                        <span></span>             <span></span>             <span></span>          
          </div>
                   
          <p>Loading Admin Section...</p>
                 
        </div>

                       
        <div v-if="chatMessages.length === 0 && !loading" class="cdUser011011-empty-state">
                   
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
          :disabled="sending || !isConnected"
          class="cdUser011011-message-input"
        />
               
        <button
          @click="sendMessage"
          class="cdUser011011-send-btn"
          :disabled="!newMessage.trim() || sending || !isConnected"
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

<style scoped>
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
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.cdUser011011-chat-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.cdUser011011-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
}

.cdUser011011-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #111827;
  margin: 0;
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

/* Messages Area */
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

/* Message Row */
.cdUser011011-message-row {
  display: flex;
  margin: 0;
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

/* Admin messages on LEFT */
.cdUser011011-message-row.admin {
  justify-content: flex-start;
}

/* User messages on RIGHT */
.cdUser011011-message-row.user {
  justify-content: flex-end;
}

.cdUser011011-message-content {
  display: flex;
  gap: 8px;
  max-width: 70%;
  align-items: flex-start;
}

/* Avatar alignment */
.cdUser011011-message-row.user .cdUser011011-message-content {
  flex-direction: row-reverse;
}

.cdUser011011-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: white;
  margin-top: 4px;
}

.cdUser011011-avatar-admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.cdUser011011-avatar-user {
  background: linear-gradient(135deg, #009970 0%, #00b383 100%);
}

/* Bubble Wrapper */
.cdUser011011-bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.cdUser011011-message-row.user .cdUser011011-bubble-wrapper {
  align-items: flex-end;
}

.cdUser011011-message-row.admin .cdUser011011-bubble-wrapper {
  align-items: flex-start;
}

/* Message Bubble */
.cdUser011011-message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  max-width: 100%;
}

/* Admin bubble - LEFT side - Light color */
.cdUser011011-bubble-admin {
  background: #ffffff;
  color: #1f2937;
  border-bottom-left-radius: 4px;
  border: 1px solid #e5e7eb;
}

/* User bubble - RIGHT side - Green color */
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
  color: #6b7280;
  padding: 0 8px;
}

/* Loading/Typing State */
.cdUser011011-loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.cdUser011011-typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  border: 1px solid #e5e7eb;
}

.cdUser011011-typing-indicator span {
  height: 8px;
  width: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: cdUser011011-typing 1.4s infinite ease-in-out;
}

.cdUser011011-typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}
.cdUser011011-typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes cdUser011011-typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.cdUser011011-loading-state p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
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
  padding: 40px 20px;
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
  margin: 0;
}

/* Input Area */
.cdUser011011-input-wrapper {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.cdUser011011-input-container {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 0;
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
  margin: 0;
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
  margin: 0;
  padding: 0;
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
</style>
