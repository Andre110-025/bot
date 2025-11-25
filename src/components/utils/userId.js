// utils/userId.js
function getUserId(website = '') {
  const cleanWebsite = website.replace(/[^a-zA-Z0-9]/g, '')
  let id = localStorage.getItem('chat_user_id')

  if (!id) {
    const uuid = crypto.randomUUID()
    id = `${uuid}_${cleanWebsite}`
    localStorage.setItem('chat_user_id', id)
    console.log('[UserID Created]:', id)
  } else {
    console.log('[UserID Loaded from Storage]:', id)
  }

  return id
}

export default getUserId
