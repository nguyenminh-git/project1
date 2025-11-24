// frontend/src/pages/posts/PostDetailPage.jsx
import { useEffect, useState } from 'react'
import { getProductById } from '../../services/products'
import { isFavorite, toggleFavorite } from '../../services/favorites'
import { navigate } from '../../router'
import { useAuth } from '../../context/auth.hooks'
import { api } from '../../services/apiClient'

// URL gốc của backend (dùng cho ảnh tĩnh)
const API_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

// ====== "CSS" INLINE DẠNG OBJECT ======
const styles = {
  detailInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px 0',
  },
  itemTitle: {
    fontSize: '1.8rem',
    fontWeight: 700,
    lineHeight: 1.3,
    margin: 0,
  },
  itemPrice: {
    fontSize: '1.6rem',
    fontWeight: 600,
    color: '#e53935',
    marginTop: 4,
  },
  itemMeta: {
    fontSize: '0.95rem',
    color: '#555',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  metaTag: {
    background: '#f3f3f3',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  dot: {
    color: '#999',
  },
  itemDesc: {
    fontSize: '1rem',
    color: '#444',
    lineHeight: 1.5,
    marginTop: 8,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  btnBase: {
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    border: 'none',
    transition: '0.2s',
  },
  btnPrimary: {
    background: '#1976d2',
    color: '#fff',
  },
  btnSecondary: {
    background: '#eee',
    color: '#333',
  },
}

// Hàm build URL ảnh an toàn
function buildImageUrl(path) {
  if (!path) return ''

  // Nếu backend trả sẵn full URL thì dùng luôn
  if (/^https?:\/\//i.test(path)) return path

  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalized}`
}

/* ================================
   HÀM GỌI API BÌNH LUẬN & ĐÁNH GIÁ
================================ */

async function fetchComments(postId) {
  // backend/routes/comments.js
  return api.get(`/api/comments/${postId}`)
}

async function createComment(postId, content) {
  return api.post(`/api/comments/${postId}`, { noiDung: content })
}

async function fetchUserRating(userId) {
  // backend/routes/ratings.js
  return api.get(`/api/ratings/reputation/${userId}`)
}

async function createRating(userId, score, comment = '') {
  return api.post('/api/ratings', {
    toUserId: userId,
    diem: score,
    nhanXet: comment,
  })
}

export default function PostDetailPage({ params }) {
  const { id } = params
  const { user } = useAuth()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favorite, setFavorite] = useState(false)

  // Bình luận & đánh giá
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [sellerRating, setSellerRating] = useState(null)
  const [myRating, setMyRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  // ================== LOAD BÀI ĐĂNG ==================
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    getProductById(id)
      .then((data) => {
        if (!isMounted) return
        setItem(data)

        if (data?.id != null) {
          setFavorite(isFavorite(data.id))
        }
      })
      .catch((err) => {
        console.error('Không tìm thấy sản phẩm:', err)
        if (!isMounted) return
        setItem(null)
        setError('Không tìm thấy sản phẩm hoặc đã bị xóa.')
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  // ================== LOAD BÌNH LUẬN & ĐÁNH GIÁ ==================
  useEffect(() => {
    if (!item) return

    // Bình luận theo bài đăng
    fetchComments(item.id)
      .then((data) => setComments(data || []))
      .catch((err) => console.error('Load comments error', err))

    // Điểm uy tín người bán
    if (item.sellerId != null) {
      fetchUserRating(item.sellerId)
        .then((data) => setSellerRating(data))
        .catch((err) => console.error('Load rating error', err))
    }
  }, [item])

  if (loading) {
    return <div className="page">Đang tải...</div>
  }

  if (error || !item) {
    return <div className="page">{error || 'Không tìm thấy sản phẩm.'}</div>
  }

  const imageUrl = item.images?.[0]
    ? buildImageUrl(item.images[0])
    : 'https://via.placeholder.com/600x400?text=Item'

  // ================== HANDLERS ==================
  const handleChat = () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!item.sellerId) {
      alert('Không tìm được người bán để mở chat.')
      return
    }

    // 👉 Lưu tạm thông tin bài đăng để ChatRoomPage gửi kèm
    try {
      sessionStorage.setItem(
        'svm_chat_post',
        JSON.stringify({
          id: item.id,
          title: item.title,
          price: item.price,
          // lưu raw path, ChatRoomPage sẽ buildImageUrl
          thumb: item.images?.[0] || null,
        }),
      )
    } catch (e) {
      console.warn('Không lưu được svm_chat_post', e)
    }

    // Router chỉ match /chats/:id, không dùng query string
    navigate(`/chats/${item.sellerId}`)
  }

  const handleToggleFavorite = () => {
    if (!item.id) return
    const nowFav = toggleFavorite(item.id)
    setFavorite(nowFav)
    alert(nowFav ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích')
  }

  const handleSubmitComment = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    const content = newComment.trim()
    if (!content) return
    try {
      await createComment(item.id, content)
      const data = await fetchComments(item.id)
      setComments(data || [])
      setNewComment('')
    } catch (err) {
      console.error(err)
      alert('Gửi bình luận thất bại')
    }
  }

  const handleSubmitRating = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!myRating) {
      alert('Anh/chị chọn số sao trước nhé')
      return
    }
    if (!item.sellerId) {
      alert('Không tìm được người bán để đánh giá.')
      return
    }
    try {
      setRatingSubmitting(true)
      await createRating(item.sellerId, myRating, ratingComment.trim())
      alert('Cảm ơn anh/chị đã đánh giá!')
      const r = await fetchUserRating(item.sellerId)
      setSellerRating(r)
      setRatingComment('')
    } catch (err) {
      console.error(err)
      alert('Gửi đánh giá thất bại')
    } finally {
      setRatingSubmitting(false)
    }
  }

  // Tính toán hiển thị điểm uy tín
  const avgScore =
    sellerRating?.DiemTB ??
    sellerRating?.average ??
    sellerRating?.avg ??
    sellerRating?.score ??
    null

  const ratingCount =
    sellerRating?.SoDanhGia ??
    sellerRating?.count ??
    sellerRating?.total ??
    0

  return (
    <div className="page post-detail-page">
      <div className="detail">
        <div className="detail-media">
          <img src={imageUrl} alt={item.title || 'Hình ảnh sản phẩm'} />
        </div>

        <div className="detail-info" style={styles.detailInfo}>
          <h1 style={styles.itemTitle}>{item.title}</h1>

          <div style={styles.itemPrice}>
            {item.price === 0
              ? 'Miễn phí'
              : item.price.toLocaleString('vi-VN') + 'đ'}
          </div>

          <div style={styles.itemMeta}>
            {item.category && (
              <span style={styles.metaTag}>{item.category}</span>
            )}
            {item.condition && (
              <>
                <span style={styles.dot}>•</span>
                <span style={styles.metaTag}>{item.condition}</span>
              </>
            )}
            {item.location && (
              <>
                <span style={styles.dot}>•</span>
                <span>{item.location}</span>
              </>
            )}
          </div>

          <p style={styles.itemDesc}>
            {item.description || 'Không có mô tả.'}
          </p>

          <div style={styles.actions}>
            <button
              style={{ ...styles.btnBase, ...styles.btnPrimary }}
              onClick={handleChat}
              type="button"
            >
              💬 Chat với người bán
            </button>

            <button
              style={{ ...styles.btnBase, ...styles.btnSecondary }}
              onClick={handleToggleFavorite}
              type="button"
            >
              {favorite ? '💔 Bỏ yêu thích' : '❤️ Yêu thích'}
            </button>
          </div>

          {/* Thông tin người bán + uy tín */}
          <div style={{ marginTop: 12, fontSize: '0.95rem', color: '#444' }}>
            <div>
              Người bán:{' '}
              <strong>{item.sellerName || `User #${item.sellerId}`}</strong>
            </div>
            {avgScore != null && (
              <div>
                Độ uy tín:{' '}
                <strong>{Number(avgScore).toFixed(1)}★</strong>{' '}
                {ratingCount > 0 && <span>({ratingCount} đánh giá)</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BẢN ĐỒ VỊ TRÍ GẦN ĐÚNG */}
      {item.location && (
        <section className="post-map" style={{ marginTop: 24 }}>
          <h3>Vị trí gần đúng</h3>
          <div
            className="map-wrapper"
            style={{
              marginTop: 8,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
            }}
          >
            <iframe
              title="Bản đồ vị trí"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                item.location,
              )}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ width: '100%', height: 260, border: 0 }}
            />
          </div>
        </section>
      )}

      {/* BÌNH LUẬN */}
      <section className="post-comments" style={{ marginTop: 24 }}>
        <h3>Bình luận</h3>
        {user && (
          <div className="comment-form" style={{ marginTop: 8 }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Viết bình luận..."
              style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
            />
            <button className="btn" type="button" onClick={handleSubmitComment}>
              Gửi bình luận
            </button>
          </div>
        )}
        {!user && <div>Đăng nhập để bình luận.</div>}

        <div className="comment-list" style={{ marginTop: 12 }}>
          {comments.length === 0 && (
            <div className="empty">Chưa có bình luận.</div>
          )}
          {comments.map((c, idx) => {
            const name =
              c.TenDangNhap || c.userName || c.authorName || 'Người dùng'
            const timeRaw =
              c.NgayBinhLuan || c.ngayBinhLuan || c.createdAt || null
            const timeLabel = timeRaw
              ? new Date(timeRaw).toLocaleString('vi-VN')
              : ''
            const content = c.NoiDung || c.noiDung || c.content

            return (
              <div
                key={c.IDBinhLuan || c.id || idx}
                className="comment-item"
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div
                  className="comment-author"
                  style={{ fontWeight: 600, fontSize: '0.95rem' }}
                >
                  {name}
                </div>
                <div
                  className="comment-time"
                  style={{ fontSize: 12, color: '#6b7280' }}
                >
                  {timeLabel}
                </div>
                <div className="comment-content" style={{ marginTop: 4 }}>
                  {content}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ĐÁNH GIÁ NGƯỜI BÁN */}
      <section className="post-rating" style={{ marginTop: 24 }}>
        <h3>Đánh giá người bán</h3>
        {!user && <div>Đăng nhập để đánh giá người bán.</div>}
        {user && (
          <>
            <div
              className="rating-stars"
              style={{ margin: '8px 0', fontSize: 20 }}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMyRating(s)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    color: s <= myRating ? '#fbbf24' : '#d1d5db',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Nhận xét (không bắt buộc)..."
              style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
            />
            <button
              className="btn"
              type="button"
              disabled={ratingSubmitting}
              onClick={handleSubmitRating}
            >
              {ratingSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
