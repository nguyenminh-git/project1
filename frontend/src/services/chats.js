// src/services/chats.js
import { api } from './apiClient'

// --------------------------------------------------
// 1. Danh sách cuộc trò chuyện
// GET /api/messages
// --------------------------------------------------
export async function listChats() {
  try {
    const data = await api.get('/api/messages')
    // backend đã trả đúng dạng:
    // { id, lastMessage, withUser: { id, name, avatar } }
    // nên trả thẳng ra, KHÔNG map lại để khỏi rơi mất avatar
    return data
  } catch (err) {
    console.error('Lỗi khi tải danh sách chat:', err)
    return []
  }
}

// --------------------------------------------------
// 2. Lịch sử 1 cuộc chat
// GET /api/messages/:otherUserId
// --------------------------------------------------
export async function getChatById(otherUserId) {
  try {
    const data = await api.get(`/api/messages/${otherUserId}`)
    // backend trả: { withUser: { id, name, avatar }, messages: [...] }
    // Trả nguyên, không bóc tách để giữ avatar + các field khác
    return data
  } catch (err) {
    console.error('Lỗi khi tải chi tiết chat:', err)
    throw err
  }
}

// --------------------------------------------------
// 3. Gửi tin nhắn text
// POST /api/messages/:otherUserId
// --------------------------------------------------
export async function sendMessage(otherUserId, noiDung, idBaiDang = null) {
  const body = { noiDung }
  if (idBaiDang) body.idBaiDang = idBaiDang
  return api.post(`/api/messages/${otherUserId}`, body)
}

// --------------------------------------------------
// 4. Gửi tin nhắn có ảnh
// POST /api/messages/upload
// --------------------------------------------------
export async function sendImageMessage(
  otherUserId,
  file,
  text = '',
  idBaiDang = null
) {
  const formData = new FormData()
  formData.append('to', otherUserId)
  formData.append('image', file)
  formData.append('text', text)

  if (idBaiDang) {
    formData.append('idBaiDang', idBaiDang)
  }

  return api.postWithFiles('/api/messages/upload', formData)
}

