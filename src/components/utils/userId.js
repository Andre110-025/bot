// let cleanupTimer = null

// export function getUserId(website = '') {
//   const cleanWebsite = website
//     .replace(/^https?:\/\//, '')
//     .replace(/^www\./, '')
//     .split('/')[0]

//   // Check if we already have an ID
//   const storedId = localStorage.getItem('chat_user_id')

//   // If not, create one
//   if (storedId) {
//     return storedId
//   }

//   const newId = `${crypto.randomUUID()}_${cleanWebsite}`
//   localStorage.setItem('chat_user_id', newId)

//   if (cleanupTimer) clearTimeout(cleanupTimer)

//   cleanupTimer = setTimeout(
//     () => {
//       console.log('Clearing everything after timeout')
//       localStorage.clear()
//       cleanupTimer = null
//     },
//     10 * 60 * 1000,
//   )

//   return newId // Just a plain string
// }

// utils/userId.js
// utils/userId.js - FINAL VERSION
export function getUserId(website = '') {
  const cleanWebsite = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  const expiryTime = localStorage.getItem('chat_user_expires')
  const now = Date.now()
  const tenMinutes = 10 * 60 * 1000

  // If expired or never set → CLEAR EVERYTHING
  if (!expiryTime || now > Number(expiryTime)) {
    console.log('🧹 10 MINUTES UP - CLEARING EVERYTHING')
    localStorage.clear()

    const newId = `${crypto.randomUUID()}_${cleanWebsite}`
    localStorage.setItem('chat_user_id', newId)
    localStorage.setItem('chat_user_expires', (now + tenMinutes).toString())

    console.log('✅ NEW ID:', newId)
    return newId
  }

  // Get existing ID
  const storedId = localStorage.getItem('chat_user_id')
  if (!storedId) {
    const newId = `${crypto.randomUUID()}_${cleanWebsite}`
    localStorage.setItem('chat_user_id', newId)
    return newId
  }

  return storedId
}
