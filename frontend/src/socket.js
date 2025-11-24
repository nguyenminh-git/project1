// src/socket.js
import { io } from 'socket.io-client'

let socket = null

export function connectSocket(user) {
  if (!user) return null
  if (socket) return socket

  const base =
    (import.meta.env.VITE_API_URL || '').trim() || window.location.origin

  socket = io(base, {
    auth: { userId: user.id },   // trùng với backend
    transports: ['websocket'],
  })

  socket.on('connect', () => {
    console.log('🔌 Socket connected', socket.id)
  })

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected')
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
