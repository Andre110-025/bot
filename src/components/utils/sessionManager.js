// utils/sessionManager.js
// Centralized session management

const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export const SessionManager = {
  /**
   * Initialize or validate user session
   */
  initSession(website) {
    this.clearExpiredSessions()

    const userId = this.getUserId(website)
    const hasValidSession = this.isSessionValid()

    return { userId, hasValidSession }
  },

  /**
   * Get or create user ID
   */
  getUserId(website) {
    const stored = localStorage.getItem('chatUser')

    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.userId) return data.userId
      } catch (e) {
        console.error('Invalid chatUser data:', e)
      }
    }

    // Generate new ID if none exists
    const cleanWebsite = website
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${cleanWebsite}`
    return userId
  },

  /**
   * Check if current session is valid
   */
  isSessionValid() {
    const stored = localStorage.getItem('chatUser')

    if (!stored) return false

    try {
      const data = JSON.parse(stored)
      const now = Date.now()

      // Check if session has expired
      if (!data.expiresAt || now > data.expiresAt) {
        return false
      }

      return true
    } catch (e) {
      return false
    }
  },

  /**
   * Create new user session
   */
  createSession(formData, userId) {
    const expiresAt = Date.now() + SESSION_DURATION
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)

    const sessionData = {
      ...formData,
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    }

    localStorage.setItem('chatUser', JSON.stringify(sessionData))
    return sessionData
  },

  /**
   * Enable admin mode
   */
  enableAdminMode() {
    const adminData = {
      active: true,
      expiresAt: Date.now() + SESSION_DURATION,
      createdAt: Date.now(),
    }

    localStorage.setItem('adminMode', JSON.stringify(adminData))
    console.log('✅ Admin mode enabled')
  },

  /**
   * Check if admin mode is active and valid
   */
  isAdminModeActive() {
    const stored = localStorage.getItem('adminMode')

    if (!stored) return false

    try {
      const data = JSON.parse(stored)
      const now = Date.now()

      if (!data.expiresAt || now > data.expiresAt) {
        localStorage.removeItem('adminMode')
        return false
      }

      return data.active === true
    } catch (e) {
      localStorage.removeItem('adminMode')
      return false
    }
  },

  /**
   * Clear all expired sessions and related data
   */
  clearExpiredSessions() {
    const now = Date.now()

    // Check and clear main session
    const chatUser = localStorage.getItem('chatUser')
    let userId = null

    if (chatUser) {
      try {
        const userData = JSON.parse(chatUser)
        userId = userData.userId

        if (!userData.expiresAt || now > userData.expiresAt) {
          console.log('🧹 Main session expired, clearing all data')
          this.clearAllUserData(userId)
          return
        }
      } catch (e) {
        console.log('🧹 Corrupted chatUser data, clearing')
        localStorage.removeItem('chatUser')
        this.clearOrphanedData()
        return
      }
    } else {
      // No main session, clear any orphaned data
      console.log('🧹 No main session, clearing orphaned data')
      this.clearOrphanedData()
      return
    }

    // If we have a valid userId, clean up its expired data
    if (userId) {
      this.cleanUserMessages(userId)
      this.cleanAdminMode()
    }
  },

  /**
   * Clear all data for a specific user
   */
  clearAllUserData(userId) {
    // Clear main session
    localStorage.removeItem('chatUser')

    // Clear admin mode
    localStorage.removeItem('adminMode')

    // Clear messages if userId exists
    if (userId) {
      localStorage.removeItem(`messages_${userId}`)
      localStorage.removeItem(`chatMessages_${userId}`)
    }

    console.log('✅ All user data cleared')
  },

  /**
   * Clean up orphaned data (data without a valid session)
   */
  clearOrphanedData() {
    const keys = Object.keys(localStorage)

    keys.forEach((key) => {
      if (key.startsWith('messages_') || key.startsWith('chatMessages_') || key === 'adminMode') {
        localStorage.removeItem(key)
        console.log(`🧹 Removed orphaned key: ${key}`)
      }
    })
  },

  /**
   * Clean expired message history for a user
   */
  cleanUserMessages(userId) {
    const now = Date.now()

    // Clean bot messages
    const botMessages = localStorage.getItem(`messages_${userId}`)
    if (botMessages) {
      try {
        const data = JSON.parse(botMessages)
        if (!data.timestamp || now - data.timestamp > SESSION_DURATION) {
          localStorage.removeItem(`messages_${userId}`)
          console.log('🧹 Cleared expired bot messages')
        }
      } catch (e) {
        localStorage.removeItem(`messages_${userId}`)
      }
    }

    // Clean admin messages
    const adminMessages = localStorage.getItem(`chatMessages_${userId}`)
    if (adminMessages) {
      try {
        const data = JSON.parse(adminMessages)
        if (!data.timestamp || now - data.timestamp > SESSION_DURATION) {
          localStorage.removeItem(`chatMessages_${userId}`)
          console.log('🧹 Cleared expired admin messages')
        }
      } catch (e) {
        localStorage.removeItem(`chatMessages_${userId}`)
      }
    }
  },

  /**
   * Clean expired admin mode
   */
  cleanAdminMode() {
    const adminMode = localStorage.getItem('adminMode')

    if (adminMode) {
      try {
        const data = JSON.parse(adminMode)
        if (!data.expiresAt || Date.now() > data.expiresAt) {
          localStorage.removeItem('adminMode')
          console.log('🧹 Cleared expired admin mode')
        }
      } catch (e) {
        localStorage.removeItem('adminMode')
      }
    }
  },

  /**
   * Force logout - clear everything
   */
  logout() {
    const chatUser = localStorage.getItem('chatUser')
    let userId = null

    if (chatUser) {
      try {
        const data = JSON.parse(chatUser)
        userId = data.userId
      } catch (e) {
        // ignore
      }
    }

    this.clearAllUserData(userId)
    console.log('🚪 User logged out')
  },

  /**
   * Get session data
   */
  getSessionData() {
    const stored = localStorage.getItem('chatUser')

    if (!stored) return null

    try {
      return JSON.parse(stored)
    } catch (e) {
      return null
    }
  },
}
