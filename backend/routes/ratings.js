import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../src/db.js';

const r = Router();

// ===================================================================
// 1. TẠO HOẶC SỬA ĐÁNH GIÁ (UPSERT)
// ===================================================================
r.post('/', auth, async (req, res) => {
  const { toUserId, diem, nhanXet } = req.body;
  const fromUserId = req.user.uid;
  const noiDungNhanXet = nhanXet || null;

  try {
    // BƯỚC 1: Thử UPDATE trước
    // $1=diem, $2=nhanXet, $3=from, $4=to
    const updateSql = `
      UPDATE "DanhGia"
      SET "Diem" = $1, "NhanXet" = $2, "NgayDanhGia" = NOW()
      WHERE "IDNguoiDanhGia" = $3 AND "IDNguoiDuocDanhGia" = $4
    `;
    
    const updateRs = await query(updateSql, [diem, noiDungNhanXet, fromUserId, toUserId]);

    // BƯỚC 2: Nếu không update được dòng nào (chưa tồn tại) -> INSERT
    if (updateRs.rowCount === 0) {
      const insertSql = `
        INSERT INTO "DanhGia"("IDNguoiDanhGia", "IDNguoiDuocDanhGia", "Diem", "NhanXet", "NgayDanhGia")
        VALUES ($1, $2, $3, $4, NOW())
      `;
      await query(insertSql, [fromUserId, toUserId, diem, noiDungNhanXet]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error reviewing user:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ===================================================================
// 2. LẤY ĐIỂM UY TÍN (REPUTATION)
// ===================================================================
r.get('/reputation/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId)) {
     return res.status(400).json({ error: 'Invalid User ID' });
  }

  try {
    // Postgres: AVG trả về kiểu Numeric, ta ép kiểu ::FLOAT để lấy số thực
    const sql = `
      SELECT 
        AVG("Diem")::FLOAT AS "DiemTB", 
        COUNT(*) AS "SoDanhGia"
      FROM "DanhGia" 
      WHERE "IDNguoiDuocDanhGia" = $1
    `;

    const rs = await query(sql, [userId]);
    const row = rs.rows[0];

    res.json({
      DiemTB: row.DiemTB || null,
      SoDanhGia: Number(row.SoDanhGia) || 0
    });
  } catch (err) {
    console.error('Error fetching reputation:', err);
    res.status(500).json({ DiemTB: null, SoDanhGia: 0 });
  }
});

export default r;