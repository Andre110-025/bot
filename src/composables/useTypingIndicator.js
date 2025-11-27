import { ref, onUnmounted } from 'vue'
import * as Ably from 'ably'
import { ChatClient } from '@ably/chat'

export function useTypingIndicator() {
  const isTyping = ref(false)
  const typingUsers = ref([]) // Array of users currently typing
  const room = ref(null) // Chat room instance
  const ChatClient = ref(null) // Ably Chat client instance

  const typingOptions = {
    heartbeatThrottleMs: 3000,
  }

  const initializeTyping = async (ablyClient, roomName = 'chat-typing') => {
    try {
      ChatClient.value = new ChatClient(ablyClient) // Initialize Ably Chat client

      room.value = await ChatClient.value.rooms.get(roomName, { typing: typingOptions }) // Get or create chat room with typing indicator
      await room.value.attach() // Attach to the room

      // Set up typing indicator subscription
      room.value.typing.subscribe((event) => {
        // Exclude current user's typing status
        const typingClientIds = Array.from(event.currentTyping).filter(
          (id) => id !== ablyClient.clientId, // Exclude current user's clientId
        )

        typingUsers.value = typingClientIds // Update typing users list
        isTyping.value = typingClientIds.length > 0 // Update isTyping status

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
      await room.value.typing.keystroke()
    }
  }

  const stopTyping = async () => {
    if (room.value) {
      await room.value.typing.keystroke() // ably automatically handles typing stop after heartbeat timeout
    }
  }

  // Function to disconnect from the typing indicator
  const disconnect = () => {
    if (room.value) {
      room.value.typing.unsubscribe() // Unsubscribe from typing events
      room.value.detach() // Detach from the room
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
