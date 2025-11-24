import { useState } from 'react'
import { useAuth } from '../../context/auth.hooks'
import { navigate } from '../../router'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      // ❗ UI CHỈNH NÀY
      setError('Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page narrow">
      <h2>Đăng nhập</h2>

      <form className="form" onSubmit={submit}>
        <label>Email hoặc tên đăng nhập</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Nhập email hoặc tên tài khoản"
        />

        <label>Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* ❗ HIỂN THỊ LỖI ĐẸP HƠN */}
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

        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </div>
      </form>

      {/* ❗ PHẦN ĐĂNG KÝ ĐẸP HƠN */}
      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '0.95rem',
        }}
      >
        Chưa có tài khoản?{' '}
        <a
          style={{ color: '#1976d2', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => navigate('/register')}
        >
          Đăng ký ngay
        </a>
      </div>
    </div>
  )
}
