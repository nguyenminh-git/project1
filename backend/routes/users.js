// backend/src/routes/users.js
import { Router } from 'express'
import { query } from '../src/db.js'

const r = Router()

// Lấy thông tin public 1 user theo ID
r.get('/:id', async (req, res) => {
  const rs = await query(
  `
  SELECT 
    IDNguoiDung,
    TenDangNhap,
    Email,
    NgayTao,
    AvatarUrl
  FROM dbo.NguoiDung
  WHERE IDNguoiDung = @id
  `,
  (rq, sql) => {
    rq.input('id', sql.Int, Number(req.params.id))
  },
)

if (!rs.recordset.length) {
  return res.status(404).json({ error: 'User not found' })
}

const row = rs.recordset[0]

res.json({
  id: row.IDNguoiDung,
  name: row.TenDangNhap,
  email: row.Email,
  joined: row.NgayTao,
  avatar: row.AvatarUrl,        
})

})

export default r
