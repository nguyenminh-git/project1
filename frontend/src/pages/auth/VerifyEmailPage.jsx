import { useState } from 'react'
import { navigate } from '../../router'
import { verifyEmail, resendVerifyCode } from '../../services/authService'

export default function VerifyEmailPage({ params }) {
  // email nhận từ router param: /verify-email/:email
  const initialEmail = params?.email || ''

  const [email] = useState(initialEmail)   // không cho sửa email
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!code) {
      setError('Vui lòng nhập mã xác thực.')
      return
    }

    setLoading(true)
    try {
      await verifyEmail(email, code)
      setMessage('Xác thực thành công! Bạn có thể đăng nhập.')
      setTimeout(() => navigate('/login'), 1000)
    } catch (err) {
      console.error(err)
      setError(err?.data?.error || 'Xác thực thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    try {
      await resendVerifyCode(email)
      setMessage('Đã gửi lại mã xác thực, vui lòng kiểm tra email.')
    } catch (err) {
      console.error(err)
      setError(err?.data?.error || 'Không gửi lại được mã.')
    }
  }

  return (
    <div className="page narrow">
      <h2>Xác thực email</h2>

      <p style={{ marginBottom: 16 }}>
        Chúng tôi đã gửi mã xác thực tới email: <b>{email}</b>.
        <br />
        Vui lòng kiểm tra hộp thư và nhập mã 6 số bên dưới.
      </p>

      <form className="form" onSubmit={submit}>
        <label>Mã xác thực (6 số)</label>
        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          placeholder="Ví dụ: 123456"
        />

        {error && (
          <div className="error-text" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}
        {message && (
          <div className="muted" style={{ marginTop: 8 }}>
            {message}
          </div>
        )}

        <button className="btn" disabled={loading}>
          {loading ? 'Đang xác thực...' : 'Xác thực'}
        </button>
      </form>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleResend}
          disabled={loading}
        >
          Gửi lại mã
        </button>
      </div>
    </div>
  )
}
