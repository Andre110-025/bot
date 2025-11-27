// src/composables/useAbly.js (User/Chatbot Side)
import { ref, readonly } from 'vue'
import * as Ably from 'ably'

const ablyService = ref(null)
const isConnected = ref(false)

// Your backend auth endpoint
const ABLY_AUTH_URL = 'https://assitance.storehive.com.ng/public/api/ably/auth'

export function useAbly() {
  const initializeAbly = async () => {
    // If already initialized, return success
    if (ablyService.value) {
      console.log('Ably already initialized')
      return true
    }

    try {
      console.log('🔄 Initializing Ably connection...')

      const res = await fetch(ABLY_AUTH_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Auth endpoint error:', errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }

      const json = await res.json()
      console.log('Auth response:', json)

      if (!json.success) {
        throw new Error(json.message || json.error || 'Auth failed')
      }

      // Initialize Ably
      const ably = new Ably.Realtime({
        token: json.data.token,
        echoMessages: false,
        clientId: json.data.clientId || undefined,
        autoConnect: true,
      })

      // Connection event handlers
      ably.connection.on('connected', () => {
        console.log('✅ Ably CONNECTED (User)')
        isConnected.value = true
      })

      ably.connection.on('connecting', () => {
        console.log('🔄 Ably connecting...')
      })

      ably.connection.on('disconnected', () => {
        console.log('⚠️ Ably disconnected')
        isConnected.value = false
      })

      ably.connection.on('failed', (error) => {
        console.error('❌ Ably connection failed:', error)
        isConnected.value = false
      })

      ablyService.value = ably
      return true
    } catch (err) {
      console.error('❌ Ably initialization failed:', err)
      return false
    }
  }

  /**
   * Subscribe to messages for a specific session
   * This is what the user needs - listen for admin replies to THEIR chat
   * @param {string} sessionId - The user's session ID
   * @param {function} callback - Callback when admin sends a message
   */
  // const onAdminReply = (sessionId, callback) => {
  //   if (!ablyService.value) {
  //     console.error('❌ Cannot subscribe: Ably not initialized')
  //     return () => {}
  //   }

  //   try {
  //     // Listen to the chat-messages channel
  //     const channel = ablyService.value.channels.get('chat-messages')

  //     // Subscribe and filter for this user's session
  //     const handler = (msg) => {
  //       if (msg.name === 'new.message' && msg.data) {
  //         // Only process messages for THIS session from admin
  //         if (msg.data.session_id === sessionId && msg.data.sender_type === 'admin') {
  //           console.log('💬 Admin replied:', msg.data)
  //           callback(msg.data)
  //         }
  //       }
  //     }

  //     channel.subscribe(handler)
  //     console.log(`✅ Listening for admin replies on session: ${sessionId}`)

  //     // Return unsubscribe function
  //     return () => {
  //       channel.unsubscribe(handler)
  //       console.log(`🔕 Stopped listening to session: ${sessionId}`)
  //     }
  //   } catch (err) {
  //     console.error('❌ Subscribe error:', err)
  //     return () => {}
  //   }
  // }

  const onAdminReply = (sessionId, callback) => {
    if (!ablyService.value) {
      console.error('❌ Cannot subscribe: Ably not initialized')
      return () => {}
    }

    try {
      // Listen to the chat-messages channel
      const channel = ablyService.value.channels.get('chat-messages')

      // Subscribe and filter for this user's session
      const handler = (msg) => {
        console.log('🔔 USER RAW ABLY MESSAGE:', {
          channel: 'chat-messages',
          data: msg.data, // ← The data is here!
          fullMessage: msg,
        })

        // NEW CODE: Check event_type inside msg.data
        if (msg.data && msg.data.event_type === 'new.message') {
          console.log('📩 Potential admin message detected:', msg.data)

          if (msg.data.session_id === sessionId && msg.data.sender_type === 'admin') {
            console.log('🎯 ✅ ADMIN MESSAGE FOR ME! Processing...', msg.data)
            callback(msg.data)
          }
        }
      }

      // Add channel state monitoring
      channel.on('attached', () => {
        console.log(`✅ Channel 'chat-messages' attached for user session: ${sessionId}`)
      })

      channel.on('failed', (stateChange) => {
        console.error(`❌ Channel 'chat-messages' failed:`, stateChange)
      })

      channel.subscribe(handler)
      console.log(
        `✅ Listening for admin replies on session: ${sessionId} (channel: chat-messages)`,
      )

      // Return unsubscribe function
      return () => {
        channel.unsubscribe(handler)
        console.log(`🔕 Stopped listening to session: ${sessionId}`)
      }
    } catch (err) {
      console.error('❌ Subscribe error:', err)
      return () => {}
    }
  }

  /**
   * Generic subscribe function (if you need it for other channels)
   */
  const subscribe = (channelName, callback) => {
    if (!ablyService.value) {
      console.error('❌ Cannot subscribe: Ably not initialized')
      return () => {}
    }

    try {
      const channel = ablyService.value.channels.get(channelName)

      channel.subscribe((msg) => {
        console.log(`📩 Message on [${channelName}]:`, msg.name, msg.data)
        callback(msg)
      })

      console.log(`✅ Subscribed to channel: ${channelName}`)

      return () => {
        channel.unsubscribe()
        console.log(`🔕 Unsubscribed from channel: ${channelName}`)
      }
    } catch (err) {
      console.error(`❌ Subscribe error on ${channelName}:`, err)
      return () => {}
    }
  }

  /**
   * Disconnect and cleanup
   */
  const disconnect = () => {
    if (ablyService.value) {
      ablyService.value.close()
      ablyService.value = null
      isConnected.value = false
      console.log('👋 Ably disconnected')
    }
  }

  return {
    isConnected: readonly(isConnected),
    initializeAbly,
    onAdminReply,
    subscribe,
    disconnect,
  }
}
