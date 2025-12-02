// utils/userId.js
export function getUserId(website = '') {
  // Clean the website
  const cleanWebsite = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  // Check if we already have an ID
  let storedId = localStorage.getItem('chat_user_id')

  // If not, create one
  if (!storedId) {
    storedId = `${crypto.randomUUID()}_${cleanWebsite}`
    localStorage.setItem('chat_user_id', storedId)
    console.log('User ID created:', storedId)
  }

  return storedId // Just a plain string
}

// function getUserId(website = '') {
//   const cleanWebsite = website.replace(/[^a-zA-Z0-9]/g, '')
//   let id = localStorage.getItem('chat_user_id')

//   if (!id) {
//     const uuid = crypto.randomUUID()
//     id = `${uuid}_${cleanWebsite}`
//     localStorage.setItem('chat_user_id', id)
//     console.log('[UserID Created]:', id)
//   } else {
//     console.log('[UserID Loaded from Storage]:', id)
//   }

//   return id
// }

// export default getUserId
