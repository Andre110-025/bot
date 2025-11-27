import { ref, onUnmounted } from 'vue'
import { ChatClient } from '@ably/chat'

export function useTypingIndicator() {
  const isTyping = ref(false)
  const typingUsers = ref([])
  const room = ref(null)
  const chatClient = ref(null)

  const typingOptions = {
    timeoutMs: 3000,
  }

  const initializeTyping = async (ablyClient, roomName = 'chat-typing') => {
    try {
      chatClient.value = new ChatClient(ablyClient)
      room.value = await chatClient.value.rooms.get(roomName, { typing: typingOptions })
      await room.value.attach()

      room.value.typing.subscribe((event) => {
        const typingClientIds = Array.from(event.currentlyTyping).filter(
          (id) => id !== ablyClient.auth.clientId,
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
