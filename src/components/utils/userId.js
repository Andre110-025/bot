// utils/userId.js
function getUserId() {
  let id = localStorage.getItem('chat_user_id')
  if (!id) {
    id = crypto.randomUUID() // built-in in modern browsers
    localStorage.setItem('chat_user_id', id)
  }
  return id
}

export default getUserId
