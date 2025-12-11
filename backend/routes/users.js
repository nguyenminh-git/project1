// backend/src/routes/users.js
import { Router } from 'express'
import { query } from '../src/db.js'

const r = Router()

// Lấy thông tin public 1 user theo ID
r.get('/:id', async (req, res) => {
  const userId = Number(req.params.id)

  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: 'Invalid User ID' })
  }

  try {
    // Postgres: Dùng $1 cho tham số
    const sql = `
      SELECT 
        "IDNguoiDung",
        "TenDangNhap",
        "Email",
        "NgayTao",
        "AvatarUrl"
      FROM "NguoiDung"
      WHERE "IDNguoiDung" = $1
    `

    // Truyền tham số dưới dạng mảng
    const rs = await query(sql, [userId])

    // Postgres: Dữ liệu nằm trong rs.rows
    if (rs.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const row = rs.rows[0]

    res.json({
      id: row.IDNguoiDung,
      name: row.TenDangNhap,
      email: row.Email,
      joined: row.NgayTao,
      avatar: row.AvatarUrl,        
    })

  } catch (err) {
    console.error('Error fetching user:', err)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

export default r