// src/pages/users/UserProfilePage.jsx
import { useEffect, useState } from 'react'
import { api } from '../../services/apiClient'

export default function UserProfilePage({ params }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const id = Number(params.id)

  useEffect(() => {
    if (!Number.isFinite(id)) return
    api
      .get(`/api/users/${id}`)
      .then(setProfile)
      .catch((err) => {
        console.error(err)
        setError('Không tải được thông tin người dùng.')
      })
  }, [id])

  if (error) return <div className="page">{error}</div>
  if (!profile) return <div className="page">Đang tải hồ sơ...</div>

  // ==== AVATAR: giống ProfilePage / App.jsx ====
  // build URL ảnh nếu backend trả đường dẫn tương đối
const avatarRaw =
  profile.avatarUrl || profile.avatar || profile.AvatarUrl || null

let avatarUrl = '/default-avatar.png'
if (avatarRaw) {
  if (/^https?:\/\//i.test(avatarRaw)) {
    avatarUrl = avatarRaw
  } else {
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
    const path = avatarRaw.startsWith('/') ? avatarRaw : '/' + avatarRaw
    avatarUrl = base + path
  }
}


  return (
    <div className="page user-profile">
      <img
    src={avatarUrl}
    alt={profile.name}
    className="user-profile-avatar"
  />
  <div>
    <h2>{profile.name}</h2>
    <p className="muted">Email: {profile.email}</p>
    <p className="muted">
      Tham gia:{' '}
      {profile.joined &&
        new Date(profile.joined).toLocaleDateString('vi-VN')}
    </p>
  </div>

      <div className="user-profile-body">
        {profile.truong && <p>Trường: {profile.truong}</p>}
        {profile.khoa && <p>Khoa: {profile.khoa}</p>}
        {profile.lop && <p>Lớp: {profile.lop}</p>}
        {profile.bio && (
          <>
            <h3>Giới thiệu</h3>
            <p>{profile.bio}</p>
          </>
        )}
      </div>
    </div>
  )
}
