// // utils/userId.js
// export function getUserId(website = '') {
//   // Clean the website
//   const cleanWebsite = website
//     .replace(/^https?:\/\//, '')
//     .replace(/^www\./, '')
//     .split('/')[0]

//   // Check if we already have an ID
//   let storedId = localStorage.getItem('chat_user_id')

//   // If not, create one
//   if (!storedId) {
//     storedId = `${crypto.randomUUID()}_${cleanWebsite}`
//     localStorage.setItem('chat_user_id', storedId)
//     console.log('User ID created:', storedId)
//   }

//   return storedId // Just a plain string
// }

// utils/userId.js
export function getUserId(website = '') {
  // Clean the website
  const cleanWebsite = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  const storedId = localStorage.getItem('chat_user_id')
  const storedTime = localStorage.getItem('chat_user_id_time')

  // Check if ID exists and is less than 24 hours old
  if (storedId && storedTime) {
    const hoursPassed = (Date.now() - Number(storedTime)) / (1000 * 60 * 60)
    if (hoursPassed < 24) return storedId
  }

  // Clear old and create new
  const newId = `${crypto.randomUUID()}_${cleanWebsite}`
  localStorage.setItem('chat_user_id', newId)
  localStorage.setItem('chat_user_id_time', Date.now().toString())

  return newId
}
