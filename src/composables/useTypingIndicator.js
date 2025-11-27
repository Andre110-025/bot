import { ref, computed } from 'vue'
import { ChatClient } from '@ably/chat'

export function useTypingIndicator() {
  const typingUsers = ref([])
  const room = ref(null)
  let chatClient = null

  // Add computed property for isTyping
  const isTyping = computed(() => typingUsers.value.length > 0)

  const initializeTyping = async (ablyRealtimeClient, roomName) => {
    try {
      chatClient = new ChatClient(ablyRealtimeClient)

      room.value = await chatClient.rooms.get(roomName, {
        typing: { timeoutMs: 3000 },
      })

      await room.value.attach()

      room.value.typing.subscribe((event) => {
        const typingClientIds = Array.from(event.currentlyTyping).filter(
          (id) => id !== chatClient.clientId,
        )
        typingUsers.value = typingClientIds
      })

      return true
    } catch (error) {
      console.error('Error initializing typing:', error)
      return false
    }
  }

  const startTyping = async () => {
    if (room.value) {
      await room.value.typing.start()
    }
  }

  const stopTyping = async () => {
    if (room.value) {
      await room.value.typing.stop()
    }
  }

  const disconnect = () => {
    if (room.value) {
      room.value.typing.unsubscribe()
      room.value.detach()
    }
  }

  return {
    isTyping, // ✅ Add this
    typingUsers,
    initializeTyping,
    startTyping,
    stopTyping,
    disconnect,
  }
}
