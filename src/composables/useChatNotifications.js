import { ref, readonly } from 'vue'

// Global reactive state
const hasUnreadMessages = ref(false)
const unreadCount = ref(0)

export function useChatNotifications() {
  const setUnreadMessage = (hasUnread = true) => {
    hasUnreadMessages.value = hasUnread
    if (hasUnread) {
      unreadCount.value++
    } else {
      unreadCount.value = 0
    }
  }

  const clearUnreadMessages = () => {
    hasUnreadMessages.value = false
    unreadCount.value = 0
  }

  return {
    hasUnreadMessages: readonly(hasUnreadMessages),
    unreadCount: readonly(unreadCount),
    setUnreadMessage,
    clearUnreadMessages,
  }
}
