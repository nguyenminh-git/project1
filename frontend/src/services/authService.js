// src/services/authService.js
import { api } from './apiClient'

/**
 * Đăng ký tài khoản mới (kèm ảnh avatar nếu có).
 * Backend: POST /api/auth/register (multipart/form-data)
 *
 * @param {string} username - Tên đăng nhập
 * @param {string} password - Mật khẩu
 * @param {string} email - Email
 * @param {File|null} avatarFile - Ảnh đại diện (tùy chọn)
 */
export async function register(username, password, email, avatarFile) {
  const form = new FormData()
  form.append('username', username)
  form.append('password', password)
  form.append('email', email)

  if (avatarFile) {
    // trùng với uploadAvatar.single('avatar') bên backend
    form.append('avatar', avatarFile)
  }

  // Gửi form-data, để browser tự set Content-Type + boundary
  const response = await api.postWithFiles('/api/auth/register', form)
  return response
}

/**
 * Xác thực email bằng mã 6 số gửi về email.
 * Backend: POST /api/auth/verify-email
 *
 * @param {string} email
 * @param {string} code
 */
export async function verifyEmail(email, code) {
  return api.post('/api/auth/verify-email', { email, code })
}

/**
 * Gửi lại mã xác thực email.
 * Backend: POST /api/auth/resend-verify-code
 *
 * @param {string} email
 */
export async function resendVerifyCode(email) {
  return api.post('/api/auth/resend-verify-code', { email })
}

/**
 * Hàm login không cần logic vì đã xử lý trong AuthProvider.
 * Để nguyên để tránh phá interface hiện tại.
 */
export async function login(username, password) {
  // Để trống như cũ
}
