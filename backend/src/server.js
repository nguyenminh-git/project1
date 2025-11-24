import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'http'                    
import { Server as SocketIOServer } from 'socket.io' 

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env'), override: true })

console.log('[ENV]', process.env.SQL_SERVER, process.env.SQL_USER)

import express from 'express'
import cors from 'cors'

// Import Middleware bảo mật
import { auth as protect, isAdmin } from '../middleware/auth.js'

// Import các Routes
import auth from '../routes/auth.js'
import posts from '../routes/posts.js'
import comments from '../routes/comments.js'
import favorites from '../routes/favorites.js'
import messages from '../routes/messages.js'
import notifications from '../routes/notifications.js'
import ratings from '../routes/ratings.js'
import reports from '../routes/reports.js'
import search from '../routes/search.js'
import admin from '../routes/admin.js'

import users from '../routes/users.js'


const app = express()
app.use(cors())

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname, '../public')))
app.use(express.json({ limit: '2mb' }))

app.get('/', (req, res) => res.json({ ok: true, service: 'market-api' }))

// ------------------------------------------------
// Routes công cộng
// ------------------------------------------------
app.use('/api/auth', auth)
app.use('/api/search', search)
app.use('/api/posts', posts)

// ------------------------------------------------
// Routes yêu cầu đăng nhập
// ------------------------------------------------
app.use('/api/comments', protect, comments)
app.use('/api/favorites', protect, favorites)
app.use('/api/ratings', protect, ratings)
app.use('/api/reports', protect, reports)
app.use('/api/messages', protect, messages)
app.use('/api/notifications', protect, notifications)
// PHỤC VỤ ẢNH /uploads/* KHÔNG CẦN LOGIN
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/users', users)


// ------------------------------------------------
// Routes Quản trị
// ------------------------------------------------
app.use('/api/admin', protect, isAdmin, admin)

// ================== SOCKET.IO ==================
const server = http.createServer(app)

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',              // nếu muốn chặt hơn thì để đúng domain frontend
    credentials: true,
  },
})

// cho phép truy cập io từ req.app.get('io')
app.set('io', io)

// Kết nối socket
io.on('connection', (socket) => {
  console.log('⚡ Client connected', socket.id)

  // 👉 Lấy userId từ auth gửi lên (cho đơn giản, anh pass từ frontend)
  const userId = socket.handshake.auth?.userId
  if (!userId) {
    console.log('⛔ socket không có userId, disconnect')
    socket.disconnect(true)
    return
  }

  // Join vào room riêng theo user
  const room = `user:${userId}`
  socket.join(room)
  console.log(`👤 User ${userId} joined room ${room}`)

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected', socket.id)
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log('Server listening on ' + PORT)
})
