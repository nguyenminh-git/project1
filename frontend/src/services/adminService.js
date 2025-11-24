// src/services/adminService.js
import { api } from './apiClient'

// ------------------ USERS ------------------

// Lấy danh sách user cho admin
export async function adminListUsers() {
  const rs = await api.get('/api/admin/users')
  // Map dữ liệu DB -> shape frontend
  return rs.map((u) => ({
    id: u.IDNguoiDung,
    name: u.TenDangNhap,
    email: u.Email,
    role: u.VaiTro,
    joined: u.NgayTao,
    // TrangThai trong DB là bit/bool: 1=active, 0=blocked
    status: u.TrangThai ? 'active' : 'locked',
    posts: u.SoBaiDang || 0,     // nếu sau này anh SELECT COUNT thì gán vào đây
    verified: false,             // tạm mock, sau có cột Verified thì map vào
  }))
}

// Khóa/Mở khóa user
export async function adminUpdateUserStatus(id, nextActiveBool) {
  return api.patch(`/api/admin/users/${id}/status`, {
    status: nextActiveBool, // true/false theo backend
  })
}

// ------------------ REPORTS (option, sau này anh xài) ------------------

export async function adminListReports() {
  const rs = await api.get('/api/admin/reports')
  return rs
}

export async function adminUpdateReportStatus(id, status) {
  return api.patch(`/api/admin/reports/${id}/status`, { status })
}

// ------------------ POSTS (xóa bài) ------------------

export async function adminDeletePost(id) {
  return api.delete(`/api/admin/posts/${id}`)
}

// Lấy danh sách bài đăng cho admin
export async function adminListPosts() {
  const rs = await api.get('/api/admin/posts')
  // map sang cấu trúc mà AdminDashboardPage đang dùng
  return (rs || []).map((p) => ({
    id: p.IDBaiDang,
    title: p.TieuDe,
    seller: p.SellerName,
    created: p.NgayDang,
    price: p.Gia,
    // map trạng thái DB -> UI
    status:
      p.TrangThai === 'ConHang'
        ? 'approved'
        : p.TrangThai === 'DaBan' || p.TrangThai === 'DaTraoDoi'
        ? 'flagged'
        : 'pending',
    reports: p.ReportCount || 0,
  }))
}

// Lấy thống kê nhanh
export async function adminGetStats() {
  const s = await api.get('/api/admin/stats')
  return {
    totalPosts: s.TotalPosts ?? 0,
    pendingPosts: s.PendingPosts ?? 0,
    flaggedPosts: s.PendingReports ?? 0, // hoặc ApprovedPosts tuỳ cách hiểu
    activeUsers: s.ActiveUsers ?? 0,
  }
}