import { useEffect, useState } from 'react'
import { useAuth } from '../../context/auth.hooks'
import { listChats } from '../../services/chats'
import { navigate } from '../../router'

function buildImageUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : '/' + path
  return base + p
}

function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Xác định tin nhắn cuối cùng có phải do mình gửi không
function isLastFromMe(chat, myId) {
  if (!myId || !chat) return false

  const fromRaw =
    chat.lastFrom ??
    chat.lastSenderId ??
    chat.NguoiGuiCuoi ??
    chat.fromId ??
    chat.from

  if (fromRaw == null) return false
  return String(fromRaw) === String(myId)
}

// Detect loại tin nhắn cuối: 'product' | 'image' | 'text' | 'none'
function detectLastKind(chat) {
  if (!chat) return 'none'

  // 1. Có sản phẩm đính kèm không?
  const hasPost =
    !!(
      chat.lastPostId ??
      chat.postId ??
      chat.lastPost ??
      chat.lastHasPost ??
      chat.hasPost ??
      chat.IDBaiDangCuoi
    ) ||
    chat.lastType === 'post' ||
    chat.lastKind === 'post' ||
    chat.lastKind === 'product'

  if (hasPost) return 'product'

  // 2. Có hình ảnh không?
  const hasImage =
    !!(
      chat.lastImage ||
      chat.lastImageUrl ||
      chat.imageUrl ||
      chat.lastHasImage ||
      chat.hasImage
    ) ||
    chat.lastType === 'image' ||
    chat.lastKind === 'image'

  if (hasImage) return 'image'

  // 3. Nếu có nội dung text
  const hasText =
    chat.lastMessage ||
    chat.lastText ||
    chat.noiDung ||
    chat.NoiDung ||
    chat.previewText

  if (hasText) return 'text'

  return 'none'
}

export default function ChatsPage() {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const myId = user?.id ?? null

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const data = await listChats()
        if (!ignore) setChats(data || [])
      } catch (err) {
        console.error('Load chats error:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const openChat = (chat) => {
    if (!chat) return

    // backend /api/messages trả: { id, lastMessage, lastAt, withUser:{ id, ... } }
    const userId =
      chat.withUser?.id ??
      chat.partnerId ?? // phòng trường hợp sau này backend đổi tên
      chat.otherUserId ??
      chat.id

    console.log('openChat item =', chat, ' -> userId =', userId)

    if (!userId) {
      console.warn('Không xác định được userId cho cuộc chat:', chat)
      return
    }

    navigate(`/chats/${userId}`)
  }

  if (loading) {
    return <div className="page">Đang tải hộp thư...</div>
  }

  return (
    <div className="page chats-page">
      <h2>Hộp thư</h2>

      {chats.length === 0 ? (
        <div className="empty">Chưa có cuộc trò chuyện nào.</div>
      ) : (
        <div className="chats-list">
          {chats.map((c, idx) => {
            const partner = c.withUser || {}
            const chatId = partner.id ?? c.id ?? idx

            const avatarRaw =
              partner.avatarUrl || partner.avatar || partner.AvatarUrl || null

            let avatarUrl = '/default-avatar.png'
            if (avatarRaw) {
              avatarUrl = buildImageUrl(avatarRaw) || avatarUrl
            }

            const initial =
              partner.name?.trim()?.charAt(0)?.toUpperCase() || '?'
            const timeLabel = formatDateTime(
              c.lastAt || c.lastTime || c.ThoiGian || null,
            )

            // ===== XỬ LÝ NỘI DUNG HIỂN THỊ DÒNG CUỐI =====
            const kind = detectLastKind(c)
            const mine = isLastFromMe(c, myId)

            let rawLast
            if (kind === 'product') {
              rawLast = 'Sản phẩm'
            } else if (kind === 'image') {
              rawLast = 'Hình ảnh'
            } else if (kind === 'text') {
              rawLast =
                c.lastMessage ||
                c.lastText ||
                c.noiDung ||
                c.NoiDung ||
                'Chưa có tin nhắn'
            } else {
              rawLast = 'Chưa có tin nhắn'
            }

            const prefix = mine && kind !== 'none' ? 'Bạn: ' : ''
            const lastText = prefix + rawLast

            return (
              <button
                key={chatId}
                type="button"
                className="chat-item"
                onClick={() => openChat(c)}
              >
                <div className="chat-item-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={partner.name} />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                <div className="chat-item-main">
                  <div className="chat-item-row">
                    <span className="chat-item-name">
                      {partner.name || `User #${chatId}`}
                    </span>
                    {timeLabel && (
                      <span className="chat-item-time">{timeLabel}</span>
                    )}
                  </div>
                  <div className="chat-item-last">{lastText}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
