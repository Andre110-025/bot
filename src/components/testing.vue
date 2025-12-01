<script setup>
import { ref, readonly } from 'vue'
import * as Ably from 'ably'

const ablyService = ref(null)
const isConnected = ref(false)

const ABLY_AUTH_URL = 'https://assitance.storehive.com.ng/public/api/ably/auth'

export function useAbly() {
  const initializeAbly = async () => {
    if (ablyService.value) {
      // console.log('Ably already initialized')
      return true
    }

    try {
      // console.log('🔄 Initializing Ably connection...')

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

      const ably = new Ably.Realtime({
        token: json.data.token,
        echoMessages: false,
        clientId: json.data.clientId || undefined,
        autoConnect: true,
      })

      ably.connection.on('connected', () => {
        // console.log('✅ Ably CONNECTED (User)')
        isConnected.value = true
      })

      ably.connection.on('connecting', () => {
        // console.log('🔄 Ably connecting...')
      })

      ably.connection.on('disconnected', () => {
        // console.log('⚠️ Ably disconnected')
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

  const onAdminReply = (sessionId, callback) => {
    if (!ablyService.value) {
      // console.error('❌ Cannot subscribe: Ably not initialized')
      return () => {}
    }

    try {
      const channel = ablyService.value.channels.get('chat-messages')

      const handler = (msg) => {
        // console.log('🔔 USER RAW ABLY MESSAGE:', {
        //   channel: 'chat-messages',
        //   eventName: msg.name,
        //   data: msg.data,
        //   timestamp: msg.timestamp,
        // })

        // FIXED: Check msg.name (not msg.data.event_type)
        if (msg.name === 'new.message' && msg.data) {
          // console.log('📩 Potential message detected:', msg.data)

          // FIXED: Add session ID normalization and better debugging
          const msgSession = String(msg.data.session_id).trim()
          const mySession = String(sessionId).trim()

          // console.log('🔍 Session ID Comparison:', {
          //   msgSession,
          //   mySession,
          //   match: msgSession === mySession,
          //   senderType: msg.data.sender_type,
          //   shouldProcess: msgSession === mySession && msg.data.sender_type === 'admin',
          // })

          //  FIXED: Filter for this user's session and admin messages
          if (msgSession === mySession && msg.data.sender_type === 'admin') {
            // console.log(' ADMIN MESSAGE FOR ME! Processing...', msg.data)
            callback(msg.data)
          } else {
            // console.log('⚠️ Message not for me:', {
            //   mySession,
            //   msgSession,
            //   sender: msg.data.sender_type,
            //   reason: msgSession !== mySession ? 'session_mismatch' : 'not_admin_message',
            // })
          }
        }
      }

      // Add channel state monitoring
      channel.on('attached', () => {
        // console.log(` Channel 'chat-messages' attached for user session: ${sessionId}`)
      })

      channel.on('failed', (stateChange) => {
        // console.error(`❌ Channel 'chat-messages' failed:`, stateChange)
      })

      channel.subscribe(handler)
      // console.log(
      //   ` Listening for admin replies on session: ${sessionId} (channel: chat-messages)`,
      // )

      return () => {
        channel.unsubscribe(handler)
        // console.log(`🔕 Stopped listening to session: ${sessionId}`)
      }
    } catch (err) {
      console.error('❌ Subscribe error:', err)
      return () => {}
    }
  }

  const subscribe = (channelName, callback) => {
    if (!ablyService.value) {
      console.error('❌ Cannot subscribe: Ably not initialized')
      return () => {}
    }

    try {
      const channel = ablyService.value.channels.get(channelName)

      channel.subscribe((msg) => {
        // console.log(`📩 Message on [${channelName}]:`, msg.name, msg.data)
        callback(msg)
      })

      // console.log(` Subscribed to channel: ${channelName}`)

      return () => {
        channel.unsubscribe()
        // console.log(` Unsubscribed from channel: ${channelName}`)
      }
    } catch (err) {
      console.error(`❌ Subscribe error on ${channelName}:`, err)
      return () => {}
    }
  }

  const disconnect = () => {
    if (ablyService.value) {
      ablyService.value.close()
      ablyService.value = null
      isConnected.value = false
      // console.log('👋 Ably disconnected')
    }
  }

  const sendTypingIndicator = (sessionId, isTyping) => {
    if (!channel.value) return

    channel.value.publish('typing-indicator', {
      session_id: sessionId,
      sender_type: 'user',
      is_typing: isTyping,
      timestamp: new Date().toISOString(),
    })
  }

  const onAdminTyping = (sessionId, callback) => {
    if (!channel.value) return () => {}

    let typingTimeout = null

    const listener = (message) => {
      const data = message.data
      if (data.sender_type === 'admin' && data.session_id === sessionId) {
        callback(data.is_typing)

        // Auto-clear after 3 seconds
        if (typingTimeout) clearTimeout(typingTimeout)

        if (data.is_typing) {
          typingTimeout = setTimeout(() => {
            callback(false)
          }, 3000)
        }
      }
    }

    channel.value.subscribe('typing-indicator', listener)

    return () => {
      channel.value.unsubscribe('typing-indicator', listener)
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  }

  return {
    isConnected: readonly(isConnected),
    initializeAbly,
    onAdminReply,
    subscribe,
    sendTypingIndicator,
    onAdminTyping,
    disconnect,
  }
}
</script>
