import { useState } from 'react'
import { useAuth } from '../../context/auth.hooks'
import { navigate } from '../../router'
import { register as registerService } from '../../services/authService'

export default function RegisterPage() {
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    // ✅ VALIDATE CLIENT-SIDE TRƯỚC KHI GỌI API
    // 1. Tên đăng nhập: không dấu, chỉ a-z, A-Z, 0-9, _
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(
        'Tên đăng nhập chỉ được dùng chữ không dấu, số và dấu gạch dưới (_).',
      )
      return
    }

    // 2. Email đơn giản
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ. Vui lòng kiểm tra lại.')
      return
    }

    // 3. Độ dài mật khẩu
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    // 4. Trùng khớp mật khẩu
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.')
      return
    }

    setLoading(true)
    try {
      // 1. GỌI API ĐĂNG KÝ (giữ nguyên logic cũ)
      await registerService(username, password, email, avatarFile)

      // TODO: Gửi avatarFile lên backend (nếu backend hỗ trợ)
      // Ví dụ: uploadAvatar(avatarFile)

      // 2. TỰ ĐỘNG ĐĂNG NHẬP SAU KHI ĐĂNG KÝ THÀNH CÔNG
      await login(username, password)

      navigate('/')
    } catch (e) {
      console.error('Registration/Auto-login Error:', e)

      let errorMessage
      if (e.status === 409) {
        errorMessage =
          'Tên đăng nhập hoặc Email đã tồn tại. Vui lòng chọn tên khác.'
      } else if (e.status === 401) {
        errorMessage =
          'Đăng ký thành công, nhưng đăng nhập tự động thất bại. Vui lòng đăng nhập thủ công.'
      } else {
        errorMessage = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.'
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page narrow">
      <h2>Đăng ký tài khoản</h2>

      <form className="form" onSubmit={submit}>
        <label>Tên đăng nhập (không dấu)</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="Ví dụ: nguyenanh123"
        />

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="ví dụ: sv001@truong.edu.vn"
        />

        <label>Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Ít nhất 6 ký tự"
        />

        <label>Nhập lại mật khẩu</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Nhập lại mật khẩu"
        />

        <label>Ảnh đại diện (tùy chọn)</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
        />

        {avatarPreview && (
          <div
            style={{
              marginTop: '8px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid #ddd',
              }}
            />
            <span style={{ fontSize: '0.9rem', color: '#555' }}>
              Xem trước ảnh đại diện
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#ffe1e1',
              color: '#c62828',
              padding: '10px',
              borderRadius: '6px',
              marginTop: '8px',
              fontSize: '0.95rem',
            }}
          >
            {error}
          </div>
        )}

        <button className="btn" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>

      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '0.95rem',
        }}
      >
        Đã có tài khoản?{' '}
        <a
          style={{ color: '#1976d2', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => navigate('/login')}
        >
          Đăng nhập
        </a>
      </div>
    </div>
  )
}
