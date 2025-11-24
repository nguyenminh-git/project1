// src/services/apiClient.js
// Central API client and integration points
export const USE_MOCKS = false

// If VITE_API_URL is not set, use relative path (works with Vite proxy)
const BASE = (import.meta.env.VITE_API_URL || '').trim()

// ===== Helpers đọc / ghi user trong localStorage =====
function getStoredUser() {
  try {
    const raw = localStorage.getItem('svm_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredUser(user) {
  try {
    localStorage.setItem('svm_user', JSON.stringify(user))
  } catch {
    // ignore
  }
}

function clearStoredUser() {
  try {
    localStorage.removeItem('svm_user')
  } catch {
    // ignore
  }
}

// ===== Gắn Authorization header =====
function withAuthHeaders(headers = {}) {
  const u = getStoredUser()
  if (u?.token) {
    return { ...headers, Authorization: `Bearer ${u.token}` }
  }
  return headers
}

// ===== Gọi /api/auth/refresh để lấy accessToken mới =====
async function refreshAccessToken() {
  const current = getStoredUser()
  if (!current?.refreshToken) return null

  const url = BASE ? BASE + '/api/auth/refresh' : '/api/auth/refresh'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json() // backend nên trả { accessToken, refreshToken? }

    if (!data.accessToken) return null

    const newUser = {
      ...current,
      token: data.accessToken,
      // nếu backend không trả refreshToken mới thì giữ cái cũ
      refreshToken: data.refreshToken || current.refreshToken,
    }
    setStoredUser(newUser)
    return newUser.token
  } catch {
    return null
  }
}

// ===== JSON API =====
async function realFetch(path, options = {}) {
  const url = BASE ? BASE + path : path

  // headers cho lần gọi đầu
  const baseHeaders = withAuthHeaders({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  })

  const doFetch = async (extraOptions = {}) => {
    const res = await fetch(url, {
      ...options,
      ...extraOptions,
    })

    if (res.ok) {
      // thành công
      return res.json()
    }

    // đọc body lỗi 1 lần
    let payload = null
    try {
      payload = await res.json()
    } catch {
      // ignore
    }

    const error = new Error(`API error ${res.status}`)
    error.status = res.status
    error.data = payload
    throw error
  }

  try {
    // Lần 1
    return await doFetch({ headers: baseHeaders })
  } catch (err) {
    // Nếu không phải 401 hoặc đã retry rồi thì quăng lỗi luôn
    const isTokenExpired =
      err.status === 401 && err.data && err.data.code === 'TOKEN_EXPIRED'
    if (!isTokenExpired || options._retry) {
      throw err
    }

    // Thử refresh
    const newToken = await refreshAccessToken()
    if (!newToken) {
      // refresh fail -> đăng xuất & chuyển về login
      clearStoredUser()
      // tuỳ anh, có thể chỉ alert rồi navigate, ở đây em cho reload nhẹ
      window.location.href = '/login'
      throw err
    }

    // Retry 1 lần với token mới
    const retryHeaders = {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${newToken}`,
    }

    return doFetch({
      headers: retryHeaders,
      _retry: true,
    })
  }
}

// ===== FormData / upload file =====
async function realFetchFiles(path, formData, options = {}) {
  const url = BASE ? BASE + path : path

  const headers = withAuthHeaders(options.headers || {})

  const res = await fetch(url, {
    method: 'POST',
    ...options,
    headers, // KHÔNG set Content-Type, để browser tự gắn boundary
    body: formData,
  })

  if (!res.ok) {
    let payload = null
    try {
      payload = await res.json()
    } catch {
      // ignore
    }
    const error = new Error(`API error ${res.status}`)
    error.status = res.status
    error.data = payload
    throw error
  }

  return res.json()
}

// ===== API object DUY NHẤT =====
export const api = {
  get: (path) => realFetch(path),

  post: (path, body) =>
    realFetch(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: (path, body) =>
    realFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),

  put: (path, body) =>
    realFetch(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (path) => realFetch(path, { method: 'DELETE' }),

  postWithFiles: (path, formData) => realFetchFiles(path, formData),
}
