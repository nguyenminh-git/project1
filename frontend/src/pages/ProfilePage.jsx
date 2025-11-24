import { useAuth } from '../context/auth.hooks'

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    maxWidth: 480,
    width: '100%',
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    display: 'flex',
    gap: 20,
    alignItems: 'center',
  },
  avatarBox: {
    flexShrink: 0,
  },
  avatarImg: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #eee',
  },
  info: {
    flex: 1,
    fontSize: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  row: {
    margin: '4px 0',
  },
  label: {
    fontWeight: 600,
    color: '#555',
    marginRight: 4,
  },
  ratingRow: {
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    color: '#ffb300',
    letterSpacing: 1,
    fontSize: 18,
  },
  ratingText: {
    color: '#555',
    fontSize: 14,
  },
}

function maskEmail(email) {
  if (!email) return ''
  const [name, domain] = email.split('@')
  if (!domain) return email
  const prefix = name.slice(0, 3) || name
  return `${prefix}***@${domain}`
}

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return <div className="page">Vui lòng đăng nhập để xem hồ sơ.</div>
  }

  // ✅ CHỈ DÙNG AVATAR TỪ BACKEND
  // Giả sử backend trả user.avatarUrl (hoặc user.avatar / AvatarUrl)
  const avatarRaw = user.avatarUrl || user.avatar || user.AvatarUrl

  // Nếu avatarRaw là đường dẫn tương đối (/uploads/avatars/...), ghép với VITE_API_URL
  let avatarUrl = '/default-avatar.png' // ảnh mặc định, anh đặt file này trong frontend/public
  if (avatarRaw) {
    if (/^https?:\/\//i.test(avatarRaw)) {
      avatarUrl = avatarRaw
    } else {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
      const path = avatarRaw.startsWith('/') ? avatarRaw : '/' + avatarRaw
      avatarUrl = base + path
    }
  }

  const displayName = user.fullName || user.name || user.username || 'Người dùng'
  const email = user.email || ''
  const joinRaw = user.joinDate || user.createdAt || user.ngayTao
  const joinDate = joinRaw
    ? new Date(joinRaw).toLocaleDateString('vi-VN')
    : 'Chưa cập nhật'
  const transactionCount = user.transactionCount || user.transactions || 0
  const rating = 5 // mặc định 5 sao

  return (
    <div className="page">
      <h2>Hồ sơ</h2>

      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.avatarBox}>
            <img src={avatarUrl} alt="Avatar" style={styles.avatarImg} />
          </div>

          <div style={styles.info}>
            <div style={styles.name}>{displayName}</div>

            <div style={styles.row}>
              <span style={styles.label}>Email:</span>
              <span>{maskEmail(email)}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Ngày tham gia:</span>
              <span>{joinDate}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Số giao dịch:</span>
              <span>{transactionCount}</span>
            </div>

            <div style={styles.ratingRow}>
              <span style={styles.label}>Uy tín:</span>
              <span style={styles.stars}>★★★★★</span>
              <span style={styles.ratingText}>({rating}/5)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
