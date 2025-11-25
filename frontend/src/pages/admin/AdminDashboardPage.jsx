import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/auth.hooks'
import {
  adminListUsers,
  adminUpdateUserStatus,
  adminListPosts,
  adminGetStats,
  adminDeletePost,
} from '../../services/adminService'

const tabs = [
  {
    id: 'users',
    label: 'Người dùng',
    description: 'Quản lý tài khoản, khóa/mở, duyệt xác minh',
  },
  {
    id: 'posts',
    label: 'Bài đăng',
    description: 'Duyệt/xóa bài, xử lý báo cáo',
  },
  {
    id: 'stats',
    label: 'Thống kê',
    description: 'Theo dõi số liệu hoạt động',
  },
]

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState('users')

  // ====== USERS (data thật) ======
  const [users, setUsers] = useState([])
  const [userFilter, setUserFilter] = useState('all')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userError, setUserError] = useState(null)

  // ====== POSTS (data thật) ======
  const [posts, setPosts] = useState([])
  const [postFilter, setPostFilter] = useState('all')

  // ====== STATS (từ API) ======
  const [statsFromApi, setStatsFromApi] = useState(null)

  // ---------- load users từ API ----------
  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      setUserError(null)
      const data = await adminListUsers()
      setUsers(data)
    } catch (err) {
      console.error('Load users error:', err)
      setUserError('Không tải được danh sách người dùng.')
    } finally {
      setLoadingUsers(false)
    }
  }

  // ---------- load posts từ API ----------
  const loadPosts = async () => {
    try {
      const data = await adminListPosts()
      setPosts(data)
    } catch (err) {
      console.error('Load posts error:', err)
    }
  }

  // ---------- load stats từ API ----------
  const loadStats = async () => {
    try {
      const s = await adminGetStats()
      setStatsFromApi(s)
    } catch (err) {
      console.error('Load stats error:', err)
    }
  }

  // Gọi 3 hàm trên khi mở trang
  useEffect(() => {
    loadUsers()
    loadPosts()
    loadStats()
  }, [])

  const filteredUsers = useMemo(() => {
    if (userFilter === 'all') return users
    return users.filter((u) => u.status === userFilter)
  }, [users, userFilter])

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return posts
    return posts.filter((p) => p.status === postFilter)
  }, [posts, postFilter])

  // ---------- Hành động với user ----------
  const handleToggleUserStatus = async (u) => {
    const nextActive = u.status !== 'active' // đang locked -> active, đang active -> locked
    try {
      await adminUpdateUserStatus(u.id, nextActive)
      await loadUsers() // reload lại cho chắc
    } catch (err) {
      console.error('Update user status error:', err)
      alert('Không cập nhật được trạng thái user.')
    }
  }

  const handleVerifyUser = (id) => {
    // hiện tại backend chưa có API verify, nên chỉ mock trên UI
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, verified: true }
          : u,
      ),
    )
  }

  // ---------- Hành động với post (chỉ đổi state phía client) ----------
   const updatePostStatus = (id, status) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, status } : post,
      ),
    )
  }

  const handleDeletePost = async (post) => {
    const ok = window.confirm(`Anh có chắc muốn xóa bài "${post.title}"?`)
    if (!ok) return

    try {
      await adminDeletePost(post.id)
      // Xóa khỏi danh sách trên UI
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch (err) {
      console.error('Delete post error:', err)
      alert('Không xóa được bài đăng,thử lại sau nhé.')
    }
  }

  // ---------- Thống kê ----------
  const stats = useMemo(() => {
    // nếu backend đã trả stats thì ưu tiên dùng
    if (statsFromApi) {
      return [
        { label: 'Tổng bài đăng', value: statsFromApi.totalPosts },
        { label: 'Chờ duyệt', value: statsFromApi.pendingPosts },
        { label: 'Báo cáo đang chờ', value: statsFromApi.flaggedPosts },
        { label: 'Người dùng hoạt động', value: statsFromApi.activeUsers },
      ]
    }

    // fallback: tự tính từ dữ liệu đã load
    const totalPosts = posts.length
    const pendingPosts = posts.filter((p) => p.status === 'pending').length
    const flaggedPosts = posts.filter((p) => p.status === 'flagged').length
    const activeUsers = users.filter((u) => u.status === 'active').length

    return [
      { label: 'Tổng bài đăng (local)', value: totalPosts },
      { label: 'Chờ duyệt', value: pendingPosts },
      { label: 'Bị báo cáo', value: flaggedPosts },
      { label: 'Người dùng hoạt động', value: activeUsers },
    ]
  }, [posts, users, statsFromApi])

  // 🚩 Guard quyền truy cập ĐẶT SAU khi đã gọi hết hook
  if (!isAdmin) {
    return (
      <div className="page">
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ tài khoản admin mới được vào trang này.</p>
      </div>
    )
  }

  // =================== UI CHÍNH ===================
  return (
    <div className="page admin-page">
      <header className="admin-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Theo dõi và xử lý nhanh các hoạt động trên MABU.</p>
        </div>
        <div className="admin-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ========= TAB USERS ========= */}
      {activeTab === 'users' && (
        <section>
          <div className="admin-controls">
            <h3>Người dùng</h3>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>

          {loadingUsers && (
            <div className="muted">Đang tải danh sách người dùng...</div>
          )}
          {userError && <div className="error-text">{userError}</div>}

          <div
            className="admin-table"
            role="table"
            aria-label="Danh sách người dùng"
          >
            <div className="admin-row admin-head">
              <span>Tên</span>
              <span>Email</span>
              <span>Bài đăng</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>
            {filteredUsers.map((u) => (
              <div className="admin-row" key={u.id}>
                <div>
                  <div className="text-strong">{u.name}</div>
                  <div className="muted">
                    Tham gia{' '}
                    {u.joined
                      ? new Date(u.joined).toLocaleDateString('vi-VN')
                      : '—'}
                  </div>
                </div>
                <span>{u.email}</span>
                <span>{u.posts ?? 0}</span>
                <span>
                  <span className={`status-pill ${u.status}`}>
                    {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                  {u.verified && (
                    <span className="status-pill verified">
                      ✓ Đã xác minh
                    </span>
                  )}
                </span>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn-light small"
                    onClick={() => handleToggleUserStatus(u)}
                  >
                    {u.status === 'locked' ? 'Mở khóa' : 'Khóa'}
                  </button>
                  {!u.verified && (
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => handleVerifyUser(u.id)}
                    >
                      Duyệt 
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========= TAB POSTS ========= */}
      {activeTab === 'posts' && (
        <section>
          <div className="admin-controls">
            <h3>Bài đăng</h3>
            <select
              value={postFilter}
              onChange={(e) => setPostFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="flagged">Bị báo cáo</option>
            </select>
          </div>
          <div
            className="admin-table"
            role="table"
            aria-label="Danh sách bài đăng"
          >
            <div className="admin-row admin-head">
              <span>Tiêu đề</span>
              <span>Người bán</span>
              <span>Giá</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>
            {filteredPosts.map((post) => (
              <div className="admin-row" key={post.id}>
                <div>
                  <div className="text-strong">{post.title}</div>
                  <div className="muted">
                    Đăng ngày{' '}
                    {new Date(post.created).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <span>{post.seller}</span>
                <span>
                  {post.price != null
                    ? Number(post.price).toLocaleString('vi-VN') + ' đ'
                    : '—'}
                </span>

                <span>
                  <span className={`status-pill ${post.status}`}>
                    {post.status === 'pending' && 'Chờ duyệt'}
                    {post.status === 'approved' && 'Đã duyệt'}
                    {post.status === 'flagged' && 'Bị báo cáo'}
                  </span>
                  {post.reports > 0 && (
                    <span className="badge">Báo cáo: {post.reports}</span>
                  )}
                </span>
                <div className="row-actions">
                  {post.status !== 'approved' && (
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => updatePostStatus(post.id, 'approved')}
                    >
                      Duyệt
                    </button>
                  )}
                  {post.status !== 'flagged' && (
                    <button
                      type="button"
                      className="btn-light small"
                      onClick={() => updatePostStatus(post.id, 'flagged')}
                    >
                      Gắn cờ
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={() => handleDeletePost(post)}
                  >
                    Xóa bài
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========= TAB STATS ========= */}
      {activeTab === 'stats' && (
        <section>
          <div className="admin-controls">
            <h3>Thống kê nhanh</h3>
          </div>
          <div className="admin-grid">
            {stats.map((item) => (
              <div key={item.label} className="card admin-stat">
                <div className="stat-value">{item.value}</div>
                <div className="muted">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="admin-note">
            Nếu sau này anh có API thống kê chi tiết hơn, chỉ cần chỉnh lại
            hàm <code>adminGetStats</code> và phần tính <code>stats</code> là
            xong.
          </div>
        </section>
      )}
    </div>
  )
}
