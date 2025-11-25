import './App.css'
import './index.css'
import React, { useState, useEffect } from 'react'
import { RouterView, navigate } from './router'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/auth.hooks'
import { api } from './services/apiClient'
import logoUrl from './assets/mabu.svg'
import { getSocket } from './socket'  

import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CreatePostPage from './pages/posts/CreatePostPage'
import PostDetailPage from './pages/posts/PostDetailPage'
import FavoritesPage from './pages/FavoritesPage'
import ChatsPage from './pages/chat/ChatsPage'
import ChatRoomPage from './pages/chat/ChatRoomPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import SupportBot from './components/SupportBot'
import MyPostsPage from './pages/posts/MyPostsPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'  

import UserProfilePage from './pages/users/UserProfilePage'



const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/posts/new': CreatePostPage,
  '/posts/:id': PostDetailPage,
  '/favorites': FavoritesPage,
  '/chats': ChatsPage,
  '/chats/:id': ChatRoomPage,   
  '/profile': ProfilePage,
  '/users/:id': UserProfilePage,
  '/admin': AdminDashboardPage,
  '/my-posts': MyPostsPage,
  '/verify-email/:email': VerifyEmailPage,
}



// ====== ICONS ======
const icons = {
  home: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20a1 1 0 0 0 1 1h4.5v-5.5H13V21H18a1 1 0 0 0 1-1v-9.5" />
    </svg>
  ),
  post: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  heart: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20s-7-4.4-9-9.3C2 7 3.8 4.5 6.7 4.5c1.7 0 3.2.9 4.3 2.3 1.1-1.4 2.6-2.3 4.3-2.3 2.9 0 4.7 2.5 3.7 6.2-2 4.9-9 9.3-9 9.3z" />
    </svg>
  ),
  chat: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1z" />
    </svg>
  ),
  user: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20.5c1.5-3.5 4.2-5.5 7-5.5s5.5 2 7 5.5" />
    </svg>
  ),
  logout: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" />
      <path d="M16 8l4 4-4 4" />
      <path d="M11 12h9" />
    </svg>
  ),
  login: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3" />
      <path d="M8 8l-4 4 4 4" />
      <path d="M4 12h11" />
    </svg>
  ),
  register: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="2.5" />
      <path d="M3.5 19c1.2-2.8 3.4-4.3 5.5-4.3s4.3 1.5 5.5 4.3" />
      <path d="M17 8v8" />
      <path d="M13 12h8" />
    </svg>
  ),
  notification: (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 16v-5a6 6 0 0 0-12 0v5" />
      <path d="M5 16h14" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
}

const navItems = [
  { id: 'home', label: 'Trang chủ', icon: 'home', path: '/' },
  { id: 'post', label: 'Đăng bài', icon: 'post', path: '/posts/new' },
  { id: 'fav', label: 'Yêu thích', icon: 'heart', path: '/favorites' },
  { id: 'chat', label: 'Chat', icon: 'chat', path: '/chats' },
]

const footerInfo = {
  guide: {
    title: 'Hướng dẫn đăng tin',
    points: [
      'Chuẩn bị hình ảnh rõ nét, tối đa 8 ảnh.',
      'Viết tiêu đề súc tích, không spam ký tự.',
      'Mô tả chi tiết tình trạng, phụ kiện kèm theo và lý do bán.',
      'Kiểm tra lại giá, danh mục, khu vực trước khi đăng.',
    ],
  },
  rules: {
    title: 'Quy định đăng bài',
    points: [
      'Không đăng sản phẩm bị cấm theo pháp luật Việt Nam.',
      'Một sản phẩm chỉ tạo một bài, không lặp lại cùng nội dung.',
      'Không sử dụng ngôn từ phản cảm, thông tin cá nhân của người khác.',
      'Hệ thống sẽ ẩn bài nếu phát hiện spam, bán hàng đa cấp.',
    ],
  },
  policy: {
    title: 'Chính sách bảo mật',
    points: [
      'Chúng tôi chỉ thu thập dữ liệu phục vụ trải nghiệm mua bán.',
      'Thông tin nhạy cảm (mật khẩu, token) được mã hóa và không chia sẻ cho bên thứ ba.',
      'Bạn có thể yêu cầu xuất hoặc xóa dữ liệu bằng cách liên hệ support@svmarket.vn.',
      'Cập nhật chính sách sẽ được thông báo trên trang chủ và email đăng ký.',
    ],
  },
}

const currentYear = new Date().getFullYear()

function Icon({ name }) {
  return icons[name] || null
}

// 🔹 Chat box nhỏ nổi ở góc (UI)
function MiniChatBox({ chat, onClose }) {
  if (!chat) return null

  const openFullChat = () => {
    navigate(`/chats/${chat.id}`)
    onClose()
  }

  return (
    <div className="mini-chatbox">
      <div className="mini-chatbox-header">
        <div className="mini-chatbox-title">
          <span className="mini-chatbox-avatar">
            {chat.name?.charAt(0).toUpperCase() || '?'}
          </span>
          <div>
            <div className="mini-chatbox-name">{chat.name}</div>
            <div className="mini-chatbox-time">{chat.time}</div>
          </div>
        </div>
        <button
          type="button"
          className="mini-chatbox-close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="mini-chatbox-body">
        <p className="mini-chatbox-snippet">{chat.snippet}</p>
        <button
          type="button"
          className="btn btn-light mini-chatbox-button"
          onClick={openFullChat}
        >
          Mở hộp chat
        </button>
      </div>
    </div>
  )
}

function NavBar() {
  const { user, logout } = useAuth()

  // 🔎 Tìm kiếm
  const [q, setQ] = useState(() => {
    try {
      const raw = localStorage.getItem('svm_search')
      if (!raw) return ''
      const parsed = JSON.parse(raw) || {}
      return parsed.q || ''
    } catch {
      return ''
    }
  })

  const [loc, setLoc] = useState(() => {
    try {
      const raw = localStorage.getItem('svm_search')
      if (!raw) return ''
      const parsed = JSON.parse(raw) || {}
      return parsed.location || ''
    } catch {
      return ''
    }
  })

  // 🔽 Trạng thái menu
  const [openUserMenu, setOpenUserMenu] = useState(false)
  const [openChatMenu, setOpenChatMenu] = useState(false)
  const [openNotifMenu, setOpenNotifMenu] = useState(false)
  const [activeChatBox, setActiveChatBox] = useState(null)

  // Dữ liệu thật: tin nhắn & thông báo
  const [recentMessages, setRecentMessages] = useState([])
  const [notifications, setNotifications] = useState([])

  // ====== Load lần đầu từ REST khi có user ======
 // ====== Load lần đầu từ REST khi có user ======
useEffect(() => {
  if (!user) {
    setRecentMessages([])
    setNotifications([])
    return
  }

  const loadInitial = async () => {
    try {
      const [chats, notifs] = await Promise.all([
        api.get('/api/messages'),
        api.get('/api/notifications'),
      ])

      // /api/messages: [ { id, withUser:{id,name}, lastMessage } ]
      const mappedChats = (chats || []).map((c) => ({
        id: c.withUser?.id || c.id,
        name: c.withUser?.name || 'Người dùng',
        snippet: c.lastMessage || '',
        time: 'Gần đây',
      }))

      const mappedNotifs = (notifs || []).map((n) => ({
        id: n.IDThongBao || n.id,
        title: n.NoiDung || n.title,
        time: n.ThoiGian || n.time || 'Gần đây',
      }))

      setRecentMessages(mappedChats.slice(0, 5))
      setNotifications(mappedNotifs.slice(0, 5))
    } catch (err) {
      console.error('Load initial messages/notifs error:', err)
    }
  }

  loadInitial()
}, [user])



  // ====== WebSocket: chat:new & notify:new ======
 // ====== WebSocket: cập nhật realtime ======
useEffect(() => {
  const socket = getSocket()

  // Nếu chưa có socket (AuthProvider chưa connect) thì thôi
  if (!socket) return

  // Nếu chưa login thì cũng không cần listen
  if (!user) return

  // (AuthProvider đã connect/disconnect socket rồi,
  // NavBar chỉ việc lắng nghe event)
  const myId = user.id

  const handleNewChat = (msg) => {
    // Backend emit: 'message:new'
    // msg: { id, from, to, text, at, ... }
    if (!msg) return
    if (msg.from !== myId && msg.to !== myId) return

    const partnerId = msg.from === myId ? msg.to : msg.from
    const entry = {
      id: partnerId,
      name:
        msg.fromName ||
        msg.toName ||
        `Người dùng #${partnerId}`,
      snippet: msg.text || msg.NoiDung || '',
      time: 'Vừa xong',
    }

    setRecentMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== entry.id)
      return [entry, ...filtered].slice(0, 5)
    })
  }

  const handleNewNotif = (notif) => {
    const entry = {
      id: notif.id || notif.IDThongBao,
      title: notif.message || notif.NoiDung || notif.title || 'Thông báo mới',
      time: 'Vừa xong',
    }
    setNotifications((prev) => [entry, ...prev].slice(0, 5))
  }

  // 🟡 CHÚ Ý: tên event phải khớp backend
  socket.on('message:new', handleNewChat)
  socket.on('notify:new', handleNewNotif)

  return () => {
    socket.off('message:new', handleNewChat)
    socket.off('notify:new', handleNewNotif)
  }
}, [user])


  const submitSearch = () => {
    try {
      localStorage.setItem(
        'svm_search',
        JSON.stringify({ q, location: loc }),
      )
      window.dispatchEvent(new Event('svm_search_change'))
    } catch {
      // ignore
    }
    navigate('/')
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') submitSearch()
  }

  const handleLogoClick = () => navigate('/')

  // ====== Avatar & tên hiển thị ======
  const displayName = user?.name || user?.username || ''
  const userInitial =
    (displayName || '?').trim().charAt(0).toUpperCase() || 'U'

  const avatarRaw = user?.avatarUrl || user?.avatar || user?.AvatarUrl
  let avatarUrl = null
  if (avatarRaw) {
    if (/^https?:\/\//i.test(avatarRaw)) {
      avatarUrl = avatarRaw
    } else {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
      const path = avatarRaw.startsWith('/') ? avatarRaw : '/' + avatarRaw
      avatarUrl = base + path
    }
  }

  const closeAllMenus = () => {
    setOpenUserMenu(false)
    setOpenChatMenu(false)
    setOpenNotifMenu(false)
  }

  const handleLogoutClick = () => {
    const ok = window.confirm('Bạn có chắc chắn muốn đăng xuất không?')
    if (!ok) return
    logout()
    closeAllMenus()
  }

  const goProfile = () => {
    navigate('/profile')
    closeAllMenus()
  }

  const goManagePosts = () => {
  navigate('/my-posts')
  closeAllMenus()
}


  const goSettings = () => {
    navigate('/profile') // tạm dùng /profile như trang cài đặt
    closeAllMenus()
  }

  const toggleChatMenu = () => {
    if (!user) {
      navigate('/login')
      return
    }
    setOpenChatMenu((v) => !v)
    setOpenNotifMenu(false)
    setOpenUserMenu(false)
  }

  const toggleNotifMenu = () => {
    if (!user) {
      navigate('/login')
      return
    }
    setOpenNotifMenu((v) => !v)
    setOpenChatMenu(false)
    setOpenUserMenu(false)
  }

  const handleOpenMiniChat = (m) => {
    setActiveChatBox(m)
    setOpenChatMenu(false)
  }

  return (
    <header className="nav">
      <div className="nav-inner container">
        <button
          type="button"
          className="nav-left"
          onClick={handleLogoClick}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <img src={logoUrl} alt="MABU"  />
          <span>MABU</span>
        </button>

        {/* THANH TÌM KIẾM */}
        <div className="nav-search">
          <div className="home-search nav-search-box">
            <div className="seg seg-input">
              <span aria-hidden>🔎</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm sản phẩm..."
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            <div className="seg seg-input">
              <span aria-hidden>📍</span>
              <input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="Khu vực..."
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            <button
              className="seg seg-action"
              type="button"
              onClick={submitSearch}
            >
              Tìm
            </button>
          </div>
        </div>

        <nav className="nav-links nav-icons">
          {navItems.map((item) => {
            if (item.id === 'chat') {
              // 🔽 Chat có menu rơi xuống
              return (
                <div key={item.id} className="nav-user-area">
                  <button
                    type="button"
                    className="nav-icon-btn"
                    title={item.label}
                    onClick={toggleChatMenu}
                  >
                    <Icon name="chat" />
                    <span className="sr-only">{item.label}</span>
                  </button>
                  {openChatMenu && (
                    <div className="user-menu">
                      <div className="user-menu-section-title">
                        Tin nhắn gần đây
                      </div>
                      {/* Tin nhắn gần đây trong menu chat */}
                      <div className="user-menu-list">
                        {recentMessages.map((m, idx) => (
                           <button
                            key={m.id ?? `recent-${idx}`}
                            type="button"
                            className="user-menu-item"
                            onClick={() => handleOpenMiniChat(m)}
                          >
                            <div className="user-menu-icon">
                              <span className="mini-avatar">
                                {m.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="user-menu-content">
                              <div className="user-menu-row">
                                <span className="user-menu-title">{m.name}</span>
                                <span className="user-menu-time">{m.time}</span>
                              </div>
                              <div className="user-menu-snippet">
                                {m.snippet || 'Tin nhắn mới'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      
                      <button
                        type="button"
                        className="user-menu-item"
                        onClick={() => {
                          navigate('/chats')
                          closeAllMenus()
                        }}
                      >
                        <span className="user-menu-icon">📥</span>
                        <span>Đến hộp tin nhắn</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            // home / post / fav bình thường
            return (
              <button
                key={item.id}
                type="button"
                className="nav-icon-btn"
                title={item.label}
                onClick={() => navigate(item.path)}
              >
                <Icon name={item.icon} />
                <span className="sr-only">{item.label}</span>
              </button>
            )
          })}

          {user ? (
            <div className="nav-user-area">
              {/* 🔔 Thông báo có menu */}
              <div className="nav-user-area">
                <button
                  type="button"
                  className="nav-icon-btn"
                  title="Thông báo"
                  onClick={toggleNotifMenu}
                >
                  <Icon name="notification" />
                  <span className="sr-only">Thông báo</span>
                </button>
                {openNotifMenu && (
                  <div className="user-menu">
                    <div className="user-menu-section-title">
                      Thông báo gần đây
                    </div>
                    {/* Thông báo trong menu chuông */}
                    <div className="user-menu-list">
                      {notifications.map((n, idx) => (
                        <button
                          key={n.id ?? `notif-${idx}`}
                          type="button"
                          className="user-menu-item"
                          onClick={closeAllMenus}
                        >
                          {/* ...giữ nguyên phần còn lại... */}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="user-menu-item"
                      onClick={closeAllMenus}
                    >
                      <span className="user-menu-icon">📜</span>
                      <span>Xem tất cả thông báo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 👤 Avatar + menu hồ sơ */}
              <button
                type="button"
                className="nav-icon-btn nav-avatar"
                title="Tài khoản"
                onClick={() => {
                  setOpenUserMenu((v) => !v)
                  setOpenChatMenu(false)
                  setOpenNotifMenu(false)
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || 'Avatar'}
                    className="nav-avatar-img"
                  />
                ) : (
                  <span aria-hidden>{userInitial}</span>
                )}
                <span className="sr-only">Trang cá nhân</span>
              </button>

              {openUserMenu && (
                <div className="user-menu">
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={goProfile}
                  >
                    <span className="user-menu-icon">👤</span>
                    <span>Hồ sơ</span>
                  </button>
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={goManagePosts}
                  >
                    <span className="user-menu-icon">📝</span>
                    <span>Quản lý bài đăng</span>
                  </button>
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={goSettings}
                  >
                    <span className="user-menu-icon">⚙️</span>
                    <span>Cài đặt</span>
                  </button>
                  <button
                    type="button"
                    className="user-menu-item user-menu-item-danger"
                    onClick={handleLogoutClick}
                  >
                    <span className="user-menu-icon">🚪</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="nav-icon-btn"
                title="Đăng nhập"
                onClick={() => navigate('/login')}
              >
                <Icon name="login" />
                <span className="sr-only">Đăng nhập</span>
              </button>
              <button
                type="button"
                className="nav-icon-btn"
                title="Đăng ký"
                onClick={() => navigate('/register')}
              >
                <Icon name="register" />
                <span className="sr-only">Đăng ký tài khoản</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* 💬 Chat box nổi */}
      <MiniChatBox
        chat={activeChatBox}
        onClose={() => setActiveChatBox(null)}
      />
    </header>
  )
}

function FestiveDecor() {
  return (
    <div className="festive-decor" aria-hidden="true">
      <div className="decor-moon" />
      <div className="decor-mist" />
      <div className="decor-cloud decor-cloud-1" />
      <div className="decor-cloud decor-cloud-2" />
      <div className="decor-cloud decor-cloud-3" />
      <svg className="decor-sleigh" viewBox="0 0 360 150">
        <defs>
          <linearGradient
            id="sleighGlow"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#6b8cec" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <path
          d="M20 120 C70 140 120 138 170 120 C194 112 214 126 260 118 C302 110 330 124 350 132"
          stroke="rgba(173,216,230,0.4)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M30 96 Q60 130 130 110 Q160 100 190 70 L220 70 Q210 90 250 96 Q310 110 320 134 Q300 122 252 125 Q210 128 170 140 Q90 144 40 118 Z"
          fill="url(#sleighGlow)"
          opacity="0.85"
        />
        <circle cx="95" cy="64" r="18" fill="#0f172a" />
        <path d="M140 58 Q160 40 190 48 Q170 70 150 80" fill="#0f172a" />
        <path d="M200 58 Q230 52 250 60 Q240 78 218 86" fill="#0f172a" />
        <path d="M230 60 Q260 50 280 62 Q272 80 250 88" fill="#0f172a" />
        <path d="M260 62 Q290 52 310 64 Q300 82 278 90" fill="#0f172a" />
      </svg>
      <div className="decor-gifts">
        <div className="gift gift-gold">
          <span className="gift-ribbon" />
        </div>
        <div className="gift gift-red">
          <span className="gift-ribbon" />
        </div>
        <div className="gift gift-purple">
          <span className="gift-ribbon" />
        </div>
        <div className="gift-snowman">
          <div className="snowman-head">
            <span className="snowman-eye" />
            <span className="snowman-eye" />
            <span className="snowman-nose" />
          </div>
          <div className="snowman-body" />
          <div className="snowman-scarf" />
          <div className="snowman-hat" />
        </div>
        <div className="gift-lantern">
          <div className="lantern-light" />
        </div>
      </div>
      <div className="decor-fireflies">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function InfoModal({ data, onClose }) {
  if (!data) return null

  const handleBackdropClick = () => onClose()
  const handleCardClick = (e) => e.stopPropagation()

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card" onClick={handleCardClick}>
        <h3>{data.title}</h3>
        <ul>
          {data.points.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-light modal-close"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </div>
  )
}

function Layout({ children }) {
  const [infoModal, setInfoModal] = useState(null)

  const openModal = (key) => {
    setInfoModal(footerInfo[key])
  }

  const closeModal = () => setInfoModal(null)

  return (
    <div className="layout">
      <FestiveDecor />
      <NavBar />
      <main>
        <div className="container">{children}</div>
      </main>
      <footer className="footer">
        <div className="footer-inner container">
          <div className="footer-grid">
            <div>
              <h4>Liên hệ</h4>
              <p>Hotline: 0877200302</p>
              <p>Email: vungoctuyen2002ksnb@gmail.com</p>
              <p>Địa chỉ: Đại Học Giao Thông Vận Tải</p>
            </div>
            <div>
              <h4>Về chúng tôi</h4>
              <p>
                Nền tảng trao đổi đồ dùng cho sinh viên: an toàn, nhanh
                chóng, thân thiện.
              </p>
            </div>
            <div>
              <h4>Hỗ trợ</h4>
              <div className="footer-links">
                <button type="button" onClick={() => openModal('guide')}>
                  Hướng dẫn đăng tin
                </button>
                <button type="button" onClick={() => openModal('rules')}>
                  Quy định đăng bài
                </button>
                <button type="button" onClick={() => openModal('policy')}>
                  Chính sách bảo mật
                </button>
              </div>
            </div>
          </div>
          <div className="footer-copy">© {currentYear} MABU</div>
        </div>
      </footer>
      <InfoModal data={infoModal} onClose={closeModal} />
      <SupportBot />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Layout>
        <RouterView routes={routes} />
      </Layout>
    </AuthProvider>
  )
}

export default App
