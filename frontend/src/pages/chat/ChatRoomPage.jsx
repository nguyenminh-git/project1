// frontend/src/pages/chat/ChatRoomPage.jsx
import { useEffect, useRef, useState } from 'react'
import {
  getChatById,
  sendMessage,
  sendImageMessage,
} from '../../services/chats'
import { useAuth } from '../../context/auth.hooks'
import { getSocket } from '../../socket'
import { navigate } from '../../router'
import { getProductById } from '../../services/products'

function buildImageUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : '/' + path
  return base + p
}

// Tính xem message có phải của "mình" không, ưu tiên flag backend
function computeIsMe(m, myId) {
  if (m.me !== undefined) return !!m.me

  if (m.LaCuaToi !== undefined) {
    return (
      m.LaCuaToi === 1 ||
      m.LaCuaToi === true ||
      m.LaCuaToi === '1'
    )
  }

  if (m.isMine !== undefined) {
    return (
      m.isMine === 1 ||
      m.isMine === true ||
      m.isMine === '1'
    )
  }

  const fromRaw = m.from ?? m.NguoiGui ?? m.senderId
  if (myId == null || fromRaw == null) return false

  // Dùng so sánh lỏng để tránh lệch kiểu '5' vs 5
  // hoặc ép về string cũng được: String(fromRaw) === String(myId)
  // ở đây dùng ==
  return fromRaw == myId
}

// Chuẩn hoá message từ backend về dạng chung cho frontend
function normalizeMessages(rawMessages, myId) {
  if (!Array.isArray(rawMessages)) return []
  return rawMessages.map((m) => {
    const from = m.from ?? m.NguoiGui ?? m.senderId ?? null

    const id =
      m.id ??
      m.IDTinNhan ??
      m.messageId ??
      m.IdTinNhan ??
      `${from || ''}-${m.ThoiGian || m.at || ''}`

    const text = m.text ?? m.NoiDung ?? m.noiDung ?? ''
    const at =
      m.at ||
      m.ThoiGian ||
      m.createdAt ||
      m.ngayGui ||
      new Date().toISOString()

    const me = computeIsMe(m, myId)

    const imageUrl =
      m.imageUrl ?? m.ImageUrl ?? m.image ?? m.hinhAnh ?? null

    const postId =
      m.postId ??
      m.IDBaiDang ??
      m.idBaiDang ??
      m.baiDangId ??
      m.post?.id ??
      null

    const postTitle =
      m.post?.title ??
      m.postTitle ??
      m.TieuDeBaiDang ??
      m.tenBaiDang ??
      null

    const postPrice =
      m.post?.price ??
      m.postPrice ??
      m.GiaBaiDang ??
      m.giaBaiDang ??
      null

    const postThumb =
      m.post?.thumb ??
      m.postThumb ??
      m.HinhAnhBaiDang ??
      m.thumb ??
      null

    const post =
      postId != null
        ? {
            id: postId,
            title: postTitle,
            price: postPrice,
            thumb: postThumb,
          }
        : null

    return {
      id,
      text,
      at,
      me,
      imageUrl,
      post,
    }
  })
}

export default function ChatRoomPage({ params }) {
  const [chat, setChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)

  const [attachedPost, setAttachedPost] = useState(null)

  const listRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user } = useAuth()

  const myId = user?.id ?? null

  // /chats/:id
  const otherId = Number(params?.id)
  const isValidChatId = Number.isFinite(otherId)

  // ================== HÀM BỔ SUNG ẢNH/GIÁ CHO MESSAGE TỪ ID BÀI ĐĂNG ==================
  const enrichMessagesWithPost = async (messages) => {
    const needIds = Array.from(
      new Set(
        messages
          .filter((m) => m.post && m.post.id && (!m.post.thumb || m.post.price == null))
          .map((m) => m.post.id),
      ),
    )

    if (needIds.length === 0) return

    try {
      const results = await Promise.all(
        needIds.map((id) => getProductById(id).catch(() => null)),
      )

      const map = new Map()
      needIds.forEach((id, idx) => {
        if (results[idx]) map.set(id, results[idx])
      })

      if (map.size === 0) return

      setChat((prev) => {
        if (!prev || !Array.isArray(prev.messages)) return prev
        const newMessages = prev.messages.map((m) => {
          if (!m.post || !m.post.id) return m
          const prod = map.get(m.post.id)
          if (!prod) return m

          const thumb = prod.images?.[0] || m.post.thumb || null
          const price =
            prod.price != null ? prod.price : m.post.price ?? null

          return {
            ...m,
            post: {
              ...m.post,
              title: m.post.title || prod.title || prod.TieuDe || '',
              price,
              thumb,
            },
          }
        })
        return { ...prev, messages: newMessages }
      })
    } catch (e) {
      console.warn('Không enrich được post cho messages', e)
    }
  }

  // ================== LOAD LỊCH SỬ CHAT ==================
  useEffect(() => {
    if (!isValidChatId || !myId) return

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const data = await getChatById(otherId)
        if (cancelled) return

        const normalizedMessages = normalizeMessages(data.messages || [], myId)
        setChat({
          withUser: data.withUser || {},
          messages: normalizedMessages,
        })
        setError(null)

        enrichMessagesWithPost(normalizedMessages)
      } catch (err) {
        console.error('Lỗi getChatById:', err)
        if (!cancelled) setError('Không tải được cuộc trò chuyện.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [otherId, isValidChatId, myId])

  // ================== ĐỌC BÀI ĐĂNG ĐÍNH KÈM TỪ sessionStorage ==================
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('svm_chat_post')
      if (!raw) return
      const p = JSON.parse(raw)
      if (p && p.id) {
        setAttachedPost(p)
      }
    } catch (e) {
      console.warn('Parse svm_chat_post fail', e)
    } finally {
      sessionStorage.removeItem('svm_chat_post')
    }
  }, [])

  // ================== AUTO SCROLL KHI CÓ TIN MỚI ==================
  useEffect(() => {
    if (!isValidChatId) return
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [chat, isValidChatId])

  // ================== SOCKET REALTIME ==================
  useEffect(() => {
    if (!isValidChatId || !myId) return

    const socket = getSocket()
    if (!socket) return

    const handler = (msg) => {
      const fromRaw = msg.from ?? msg.NguoiGui
      const toRaw = msg.to ?? msg.NguoiNhan

      const fromNum = Number(fromRaw)
      const toNum = Number(toRaw)
      const myNum = Number(myId)

      const belongsToThisChat =
        ((fromNum === myNum && toNum === otherId) ||
          (fromNum === otherId && toNum === myNum))

      if (!belongsToThisChat) return

      const base = normalizeMessages([msg], myId)[0]

      setChat((prev) => {
        if (!prev) {
          return {
            withUser: { id: otherId },
            messages: [base],
          }
        }
        const prevMessages = Array.isArray(prev.messages) ? prev.messages : []
        if (prevMessages.some((m) => m.id === base.id)) return prev
        return { ...prev, messages: [...prevMessages, base] }
      })

      if (base.post && (!base.post.thumb || base.post.price == null)) {
        enrichMessagesWithPost([base])
      }
    }

    socket.on('message:new', handler)
    return () => socket.off('message:new', handler)
  }, [isValidChatId, myId, otherId])

  // ================== GỬI TIN NHẮN ==================
  const onSend = async () => {
    const rawText = text.trim()
    const hasText = rawText.length > 0
    const hasImage = !!imageFile
    const hasAttachedPost = !!attachedPost

    if (!hasText && !hasImage && !hasAttachedPost) return

    try {
      setSending(true)
      const postId = attachedPost?.id ?? null

      const finalText = hasText
        ? rawText
        : hasAttachedPost
        ? 'Em quan tâm sản phẩm này ạ.'
        : ''

      if (hasImage) {
        await sendImageMessage(otherId, imageFile, finalText, postId)
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        await sendMessage(otherId, finalText, postId)
      }

      setText('')
      setAttachedPost(null)
    } catch (err) {
      console.error(err)
      alert('Gửi tin nhắn thất bại')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // ================== RENDER ==================
  if (!isValidChatId) {
    return <div className="page">Cuộc trò chuyện không hợp lệ.</div>
  }

  if (loading) {
    return <div className="page">Đang tải...</div>
  }

  if (error && !chat) {
    return <div className="page">{error}</div>
  }

  const partner = chat?.withUser || {}
  const avatarRaw =
    partner.avatarUrl || partner.avatar || partner.AvatarUrl || null

  let headerAvatarUrl = '/default-avatar.png'
  if (avatarRaw) {
    headerAvatarUrl = buildImageUrl(avatarRaw) || headerAvatarUrl
  }

  const openUserProfile = () => navigate(`/users/${partner.id}`)
  const messages = Array.isArray(chat?.messages) ? chat.messages : []

  return (
    <div className="page">
      {/* HEADER */}
      <div className="chat-header">
        <button
          type="button"
          className="chat-header-user"
          onClick={openUserProfile}
        >
          <img
            src={headerAvatarUrl}
            alt={partner.name || 'Avatar'}
            className="chat-header-avatar"
          />
          <div>
            <div className="chat-header-name">
              {partner.name || `User #${partner.id}`}
            </div>
            <div className="chat-header-sub">Nhấn để xem trang cá nhân</div>
          </div>
        </button>
      </div>

      {/* BODY CHAT */}
      <div className="chat-box">
        <div className="chat-list" ref={listRef}>
          {messages.length === 0 && (
            <div className="empty">Chưa có tin nhắn nào.</div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.me ? 'me' : ''}`}>
              {m.post && (
                <button
                  type="button"
                  className="bubble-post"
                  onClick={() => navigate(`/posts/${m.post.id}`)}
                >
                  {m.post.thumb && (
                    <img
                      src={buildImageUrl(m.post.thumb)}
                      alt={m.post.title}
                      className="bubble-post-thumb"
                    />
                  )}
                  <div className="bubble-post-info">
                    <div className="bubble-post-title">{m.post.title}</div>
                    {m.post.price != null && (
                      <div className="bubble-post-price">
                        {m.post.price.toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </div>
                </button>
              )}

              {m.imageUrl && (
                <img
                  src={buildImageUrl(m.imageUrl)}
                  alt="Hình đính kèm"
                  className="bubble-image"
                />
              )}

              {m.text && <div className="content">{m.text}</div>}

              <div className="time">
                {new Date(m.at).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>

        {/* PREVIEW ẢNH ĐÍNH KÈM */}
        {imagePreview && (
          <div className="chat-image-preview">
            <img src={imagePreview} alt="Xem trước" />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Xoá ảnh
            </button>
          </div>
        )}

        {/* THẺ SẢN PHẨM SẮP GỬI */}
        {attachedPost && (
          <div className="chat-attached-post">
            <button
              type="button"
              className="bubble-post"
              onClick={() => navigate(`/posts/${attachedPost.id}`)}
            >
              {attachedPost.thumb && (
                <img
                  src={buildImageUrl(attachedPost.thumb)}
                  alt={attachedPost.title}
                  className="bubble-post-thumb"
                />
              )}
              <div className="bubble-post-info">
                <div className="bubble-post-title">{attachedPost.title}</div>
                {attachedPost.price != null && (
                  <div className="bubble-post-price">
                    {attachedPost.price.toLocaleString('vi-VN')} đ
                  </div>
                )}
              </div>
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setAttachedPost(null)}
            >
              Bỏ đính kèm
            </button>
          </div>
        )}

        {/* INPUT */}
        <div className="chat-input">
          <button
            type="button"
            className="chat-input-file-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn..."
            onKeyDown={handleKeyDown}
          />
          <button className="btn" onClick={onSend} disabled={sending}>
            {sending ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  )
}
