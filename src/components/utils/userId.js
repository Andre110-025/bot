let cleanupTimer = null

export function getUserId(website = '') {
  const cleanWebsite = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  // Check if we already have an ID
  const storedId = localStorage.getItem('chat_user_id')

  // If not, create one
  if (storedId) {
    return storedId
  }

  const newId = `${crypto.randomUUID()}_${cleanWebsite}`
  localStorage.setItem('chat_user_id', newId)

  if (cleanupTimer) clearTimeout(cleanupTimer)

  cleanupTimer = setTimeout(
    () => {
      console.log('Clearing everything after timeout')
      localStorage.clear()
      cleanupTimer = null
    },
    10 * 60 * 1000,
  )

  return newId // Just a plain string
}
