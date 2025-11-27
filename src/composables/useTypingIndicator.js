import { ref, onUnmounted } from 'vue'
import { ChatClient } from '@ably/chat'

export function useTypingIndicator() {
  const isTyping = ref(false)
  const typingUsers = ref([]) // Array of users currently typing
  const room = ref(null) // Chat room instance
  const chatClient = ref(null) // Changed from ChatClient to chatClient to avoid shadowing

  const typingOptions = {
    timeoutMs: 3000, // Changed from heartbeatThrottleMs
  }

  const initializeTyping = async (ablyClient, roomName = 'chat-typing') => {
    try {
      chatClient.value = new ChatClient(ablyClient) // Initialize Ably Chat client

      room.value = await chatClient.value.rooms.get(roomName, { typing: typingOptions })
      await room.value.attach()

      // Set up typing indicator subscription
      room.value.typing.subscribe((event) => {
        // Exclude current user's typing status
        const typingClientIds = Array.from(event.currentlyTyping).filter(
          (id) => id !== ablyClient.auth.clientId, // Fixed: access clientId correctly
        )

        typingUsers.value = typingClientIds
        isTyping.value = typingClientIds.length > 0

        console.log('Typing users updated:', typingClientIds)
      })

      return true
    } catch (error) {
      console.error('Error initializing typing indicator:', error)
      return false
    }
  }

  // Function to signal that the user has started typing
  const startTyping = async () => {
    if (room.value) {
      try {
        await room.value.typing.start()
      } catch (error) {
        console.error('Error starting typing:', error)
      }
    }
  }

  const stopTyping = async () => {
    if (room.value) {
      try {
        await room.value.typing.stop()
      } catch (error) {
        console.error('Error stopping typing:', error)
      }
    }
  }

  // Function to disconnect from the typing indicator
  const disconnect = async () => {
    if (room.value) {
      try {
        room.value.typing.unsubscribe()
        await room.value.detach()
      } catch (error) {
        console.error('Error disconnecting typing indicator:', error)
      }
    }
  }

  // Clean up on component unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    isTyping,
    typingUsers,
    initializeTyping,
    startTyping,
    stopTyping,
    disconnect,
  }
}
