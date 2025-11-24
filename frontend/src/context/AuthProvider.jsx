// frontend/src/context/AuthProvider.jsx
import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/apiClient'
import { AuthContext } from './auth.hooks'
import { connectSocket, disconnectSocket } from '../socket'

// Gọi API đăng nhập
async function callLoginApi(username, password) {
  const response = await api.post('/api/auth/login', {
    username,
    password,
  })

  // Backend phải trả { accessToken, refreshToken, user }
  if (!response || !response.accessToken || !response.user) {
    throw new Error(
      'API did not return a valid auth object (accessToken, user).',
    )
  }

  return response
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)   // 👈 THÊM

  // Khởi tạo từ localStorage
  useEffect(() => {
    let cancelled = false

    const init = () => {
      try {
        const raw = localStorage.getItem('svm_user')
        if (!raw) return

        const saved = JSON.parse(raw)
        // saved: { token, refreshToken?, user }
        if (saved?.token && saved?.user && !cancelled) {
          setToken(saved.token)
          setUser(saved.user)

          // nếu apiClient có hàm set token thì gọi ở đây
          // api.setAccessToken?.(saved.token)

          // 🔌 nối socket cho user hiện tại
          connectSocket(saved.user)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (emailOrUsername, password) => {
    const res = await callLoginApi(emailOrUsername, password)
    // res = { accessToken, refreshToken, user }

    const payload = {
      token: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
    }

    setToken(payload.token)
    setUser(payload.user)
    try {
      localStorage.setItem('svm_user', JSON.stringify(payload))
    } catch (e) {
      console.error('save svm_user error:', e)
    }

    // nếu apiClient có hàm set token thì gọi ở đây
    // api.setAccessToken?.(payload.token)

    // 🔌 nối socket sau khi login
    connectSocket(payload.user)

    // đảm bảo không còn trạng thái loading
    setLoading(false)

    return payload.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setLoading(false)
    try {
      localStorage.removeItem('svm_user')
    } catch { /* empty */ }
    // 🔌 ngắt socket
    disconnectSocket()
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,   // 👈 EXPOSE CHO useAuth
      login,
      logout,
    }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
