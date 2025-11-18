import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import 'dotenv/config'

const app = express()
app.use(express.json())
app.use(cors())

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY })

// Store chats per user ID
const userChats = {}
const adminUserChats = {}
const adminIssues = {}

const hotelContext = `
You are a helpful assistant for Oceanview Hotel in Miami Beach.
Hotel info:
- Hotel name: Oceanview Hotel
- Address: 123 Beach Ave, Miami Beach, FL
- Rooms: Standard ($120), Deluxe ($200), Suite ($350)
- Amenities: Pool, Spa, Free Wi-Fi
Answer questions ONLY based on this info.
If a question is outside this info, respond with: "I’m not sure, the admin will get back to you."
`

app.post('/api/gen', async (req, res) => {
  const { userText, userId } = req.body

  if (!userId) return res.status(400).json({ error: 'userId is required' })
  if (!userText || !userText.trim()) return res.status(400).json({ error: 'userText is required' })

  try {
    if (!userChats[userId]) userChats[userId] = []
    userChats[userId].push({ sender: 'user', text: userText })

    // Combine the hotel context + user question
    const prompt = `${hotelContext}\nUser: ${userText}\nAI:`

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    const aiReply = response.output_text || response.text || "I'm not sure how to respond."

    userChats[userId].push({ sender: 'AI', text: aiReply })

    res.json({ text: aiReply, userId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to generate response.' })
  }
})

app.post('/api/admin/repost', (req, res) => {
  const { userId, userText } = req.body
  if (!userId || !userText) {
    return res.status(400).json({ error: 'userId and userText are required' })
  }

  if (!adminIssues[userId]) adminIssues[userId] = []
  adminIssues[userId].push({
    userText,
    userId,
    timestamp: new Date().toISOString(),
  })

  res.json({ message: 'Issue sent to admin successfully' })
})

app.post('/api/admin/chat', (req, res) => {
  const { userId, sender, message } = req.body

  if (!userId || !sender || !message) {
    return res.status(400).json({ error: 'userId, sender, and message are required' })
  }

  if (!adminUserChats[userId]) adminUserChats[userId] = []

  adminUserChats[userId].push({
    sender: 'admin',
    text: message,
    timestamp: new Date().toISOString(),
  })

  res.json({ message: 'Chat stored successfully', userId })
})

app.post('/api/user/chat', (req, res) => {
  const { userId, message } = req.body
  if (!userId || !message) return res.status(400).json({ error: 'userId and message are required' })

  if (!adminUserChats[userId]) adminUserChats[userId] = []

  adminUserChats[userId].push({
    sender: 'user',
    text: message,
    timestamp: new Date().toISOString(),
  })

  res.json({ message: 'Message sent successfully', userId })
})

app.get('/api/user/chat/:userId', (req, res) => {
  const { userId } = req.params
  res.json(adminUserChats[userId] || [])
})

app.get('/api/admin/chat/:userId', (req, res) => {
  const { userId } = req.params
  res.json(adminUserChats[userId] || [])
})

app.get('/api/admin/issues', (req, res) => {
  res.json(adminIssues)
})

app.get('/api/chats', (req, res) => {
  res.json(userChats)
})

app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'))

// node server.js
