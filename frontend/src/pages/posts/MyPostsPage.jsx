// frontend/src/pages/posts/MyPostsPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/auth.hooks'
import { listProducts } from '../../services/products'
import { navigate } from '../../router'
import { api } from '../../services/apiClient'

// URL ảnh static
const STATIC_URL = (import.meta.env.VITE_STATIC_URL || 'http://localhost:3000').trim()

// Map trạng thái -> label + css
function getStatusInfo(item) {
  const raw = item.status || item.trangThai || item.TrangThai
  if (!raw) return null

  const map = {
    ConHang:   { label: 'Còn hàng',    className: 'status-available' },
    DaBan:     { label: 'Đã bán',      className: 'status-sold' },
    DaTraoDoi: { label: 'Đã trao đổi', className: 'status-traded' },
    BiKhoa:    { label: 'Bị khoá',     className: 'status-locked' },
  }

  return map[raw] || { label: raw, className: 'status-other' }
}

// Xác định bài có phải của user hiện tại không
function isMyPost(item, user) {
  if (!user) return false
  const userId = user.id
  const username = (user.username || user.name || '').toLowerCase()

  const sellerId =
    item.sellerId ??
    item.IDNguoiDung ??
    item.ownerId ??
    null

  const sellerName =
    item.seller ??
    item.sellerName ??
    item.TenDangNhap ??
    ''

  if (sellerId != null && userId != null && String(sellerId) === String(userId)) {
    return true
  }

  if (username && sellerName && sellerName.toLowerCase() === username) {
    return true
  }

  return false
}

function getCreatedTime(item) {
  const raw =
    item.created ||
    item.createdAt ||
    item.NgayDang ||
    item.ngayDang ||
    item.postedAt ||
    null
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * Một dòng bài đăng trong trang quản lý
 */
function ProductRow({
  item,
  pinned,
  onEdit,
  onDelete,
  onTogglePin,
  onChangeStatus,
}) {
  const imageUrl = item?.images?.[0]
    ? `${STATIC_URL}${item.images[0]}`
    : 'https://placehold.co/80x80/ddd/888?text=No+Image'

  const statusInfo = getStatusInfo(item)

  const goDetail = () => navigate(`/posts/${item.id}`)

  const createdLabel = (() => {
    const t = getCreatedTime(item)
    if (!t) return ''
    return new Date(t).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  })()

  const handleStatusChange = (e) => {
    const newStatus = e.target.value
    onChangeStatus?.(item, newStatus)
  }

  const currentStatus = item.status || item.trangThai || item.TrangThai || 'ConHang'

  return (
    <div className="mypost-row">
      {/* Ảnh */}
      <div className="mypost-cell mypost-cell-thumb" onClick={goDetail}>
        <img src={imageUrl} alt={item.title || 'product'} />
      </div>

      {/* Tiêu đề + meta */}
      <div className="mypost-cell mypost-cell-title" onClick={goDetail}>
        <div className="mypost-title-main" title={item.title}>
          {item.title}
        </div>
        <div className="mypost-title-sub">
          <span className="mypost-price">
            {item.price === 0
              ? 'Miễn phí'
              : item.price.toLocaleString('vi-VN') + 'đ'}
          </span>
          {item.location && (
            <span className="mypost-location">· 📍 {item.location}</span>
          )}
          {createdLabel && (
            <span className="mypost-time">· {createdLabel}</span>
          )}
        </div>
      </div>

      {/* Trạng thái */}
      <div className="mypost-cell mypost-cell-status">
        {statusInfo && (
          <span className={`status-pill ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        )}

        <select
          className="mypost-status-select"
          value={currentStatus}
          onChange={handleStatusChange}
        >
          <option value="ConHang">Còn hàng</option>
          <option value="DaBan">Đã bán</option>
          <option value="DaTraoDoi">Đã trao đổi</option>
          <option value="BiKhoa">Bị khoá</option>
        </select>

        {pinned && <span className="badge badge-pin">Đang ghim</span>}
      </div>

      {/* Hành động */}
      <div className="mypost-cell mypost-cell-actions">
        <button
          type="button"
          className="btn-ghost small"
          onClick={() => onEdit(item)}
        >
          Sửa
        </button>
        <button
          type="button"
          className="btn-light small"
          onClick={() => onDelete(item)}
        >
          Xóa
        </button>
        <button
          type="button"
          className="btn small"
          onClick={() => onTogglePin(item)}
        >
          {pinned ? 'Bỏ ghim' : 'Ghim'}
        </button>
      </div>
    </div>
  )
}

export default function MyPostsPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')

  // danh sách id bài ghim (lưu localStorage)
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('svm_pinned_posts')
      if (!raw) return []
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login')
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await listProducts() // /api/posts
        if (cancelled) return

        const mine = (res || [])
          .filter((it) => isMyPost(it, user))
          .map((it) => ({
            ...it,
            status: it.status || it.trangThai || it.TrangThai || 'ConHang',
          }))

        setItems(mine)
      } catch (err) {
        console.error('MyPostsPage load error:', err)
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // lưu pinnedIds
  useEffect(() => {
    try {
      localStorage.setItem('svm_pinned_posts', JSON.stringify(pinnedIds))
    } catch {
      // ignore
    }
  }, [pinnedIds])

  const qLower = q.trim().toLowerCase()

  // lọc theo text + trạng thái
  const filtered = useMemo(() => {
    return items.filter((it) => {
      const title = (it.title || '').toLowerCase()
      const matchQ = !qLower || title.includes(qLower)

      if (statusFilter === 'all') return matchQ
      const raw = it.status || it.trangThai || it.TrangThai || 'ConHang'
      return matchQ && raw === statusFilter
    })
  }, [items, statusFilter, qLower])

  // sắp xếp: ghim trước, trong mỗi nhóm sắp theo thời gian DESC (mới nhất trên)
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id)
      const bPinned = pinnedIds.includes(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return getCreatedTime(b) - getCreatedTime(a)
    })
    return arr
  }, [filtered, pinnedIds])

  const statusCounts = useMemo(() => {
    const base = { all: items.length, ConHang: 0, DaBan: 0, DaTraoDoi: 0, BiKhoa: 0 }
    items.forEach((it) => {
      const raw = it.status || it.trangThai || it.TrangThai || 'ConHang'
      if (base[raw] !== undefined) base[raw] += 1
    })
    return base
  }, [items])

  const handleEdit = (post) => {
    navigate(`/posts/${post.id}`)
  }

  const handleDelete = async (post) => {
    const ok = window.confirm(`Xóa bài "${post.title}"?`)
    if (!ok) return
    try {
      await api.delete(`/api/posts/${post.id}`)
      setItems((prev) => prev.filter((it) => it.id !== post.id))
      setPinnedIds((prev) => prev.filter((id) => id !== post.id))
    } catch (err) {
      console.error('Delete post error:', err)
      alert('Không xóa được bài đăng (hoặc backend chưa implement DELETE).')
    }
  }

  const handleTogglePin = (post) => {
    setPinnedIds((prev) =>
      prev.includes(post.id)
        ? prev.filter((id) => id !== post.id)
        : [...prev, post.id],
    )
  }

  const handleChangeStatus = async (post, newStatus) => {
    if (!newStatus || newStatus === post.status) return

    const old = post.status

    // đổi optimistically trên UI trước
    setItems((prev) =>
      prev.map((it) =>
        it.id === post.id ? { ...it, status: newStatus } : it,
      ),
    )

    try {
      await api.post(`/api/posts/${post.id}/status`, { status: newStatus })
    } catch (err) {
      console.error('Change status error:', err)
      alert('Không đổi được trạng thái bài đăng.')
      // revert nếu lỗi
      setItems((prev) =>
        prev.map((it) =>
          it.id === post.id ? { ...it, status: old } : it,
        ),
      )
    }
  }

  if (authLoading) {
    return <div className="page">Đang kiểm tra đăng nhập...</div>
  }

  if (!user) {
    return <div className="page">Vui lòng đăng nhập để quản lý bài đăng.</div>
  }

  return (
    <div className="page myposts-page">
      <h1>Quản lý bài đăng</h1>
      <p className="mypost-subtitle">
        Các tin bạn đã đăng, sắp xếp theo thời gian. Có thể sửa, xóa hoặc ghim
        lên đầu danh sách.
      </p>

      {/* Thanh filter + tìm kiếm */}
      <div className="mypost-toolbar">
        <div className="mypost-status-tabs">
          <button
            type="button"
            className={`mypost-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({statusCounts.all})
          </button>
          <button
            type="button"
            className={`mypost-tab ${
              statusFilter === 'ConHang' ? 'active' : ''
            }`}
            onClick={() => setStatusFilter('ConHang')}
          >
            Còn hàng ({statusCounts.ConHang})
          </button>
          <button
            type="button"
            className={`mypost-tab ${statusFilter === 'DaBan' ? 'active' : ''}`}
            onClick={() => setStatusFilter('DaBan')}
          >
            Đã bán ({statusCounts.DaBan})
          </button>
          <button
            type="button"
            className={`mypost-tab ${
              statusFilter === 'DaTraoDoi' ? 'active' : ''
            }`}
            onClick={() => setStatusFilter('DaTraoDoi')}
          >
            Đã trao đổi ({statusCounts.DaTraoDoi})
          </button>
          <button
            type="button"
            className={`mypost-tab ${
              statusFilter === 'BiKhoa' ? 'active' : ''
            }`}
            onClick={() => setStatusFilter('BiKhoa')}
          >
            Bị khoá ({statusCounts.BiKhoa})
          </button>
        </div>

        <div className="mypost-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tiêu đề..."
          />
        </div>
      </div>

      {loading ? (
        <div className="mypost-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mypost-row skeleton">
              <div className="mypost-cell mypost-cell-thumb" />
              <div className="mypost-cell mypost-cell-title">
                <div className="line" />
                <div className="line small" />
              </div>
              <div className="mypost-cell mypost-cell-status" />
              <div className="mypost-cell mypost-cell-actions" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty">
          Bạn chưa có bài đăng nào{' '}
          {statusFilter !== 'all' && 'trong trạng thái này'}.
          <button
            type="button"
            className="btn"
            style={{ marginLeft: 8 }}
            onClick={() => navigate('/posts/new')}
          >
            Đăng bài đầu tiên
          </button>
        </div>
      ) : (
        <div className="mypost-list">
          {sorted.map((it) => (
            <ProductRow
              key={it.id}
              item={it}
              pinned={pinnedIds.includes(it.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onChangeStatus={handleChangeStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
