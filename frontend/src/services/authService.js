import { api } from './apiClient'

/**
 * Hàm gọi API đăng ký người dùng mới.
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
    form.append('avatar', avatarFile) // trùng với uploadAvatar.single('avatar')
  }

  const response = await api.postWithFiles('/api/auth/register', form)
  return response
}

/**
 * Hàm login không cần logic vì đã xử lý trong AuthProvider
 */
export async function login(username, password) {
  // Để trống như cũ
}
