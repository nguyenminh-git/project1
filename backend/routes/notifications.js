import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../src/db.js';

const r = Router();

// ===================================================================
// 1. LẤY DANH SÁCH THÔNG BÁO
// ===================================================================
r.get('/', auth, async (req, res) => {
  try {
    const sql = `
      SELECT "IDThongBao", "IDNguoiNhan", "LoaiThongBao", "NoiDung", "DaDoc", "ThoiGian" 
      FROM "ThongBao" 
      WHERE "IDNguoiNhan" = $1 
      ORDER BY "ThoiGian" DESC
    `;
    
    // Postgres: Truyền params qua mảng [req.user.uid]
    const rs = await query(sql, [req.user.uid]);

    // Postgres: Dữ liệu nằm trong rs.rows
    res.json(rs.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ===================================================================
// 2. TẠO THÔNG BÁO MỚI (Internal hoặc Test)
// ===================================================================
r.post('/', auth, async (req, res) => {
  const { toUserId, loai, noiDung } = req.body;

  if (!toUserId) return res.status(400).json({ error: 'Missing toUserId' });

  try {
    // Postgres: Dùng RETURNING để lấy lại ID sau khi insert
    const sql = `
      INSERT INTO "ThongBao"("IDNguoiNhan", "LoaiThongBao", "NoiDung", "DaDoc", "ThoiGian")
      VALUES($1, $2, $3, 0, NOW())
      RETURNING "IDThongBao", "ThoiGian";
    `;

    const rs = await query(sql, [toUserId, loai, noiDung]);
    
    const row = rs.rows[0];
    const newId = row.IDThongBao;
    const time = row.ThoiGian; // Lấy thời gian thực từ DB luôn cho chuẩn

    // 🔥 EMIT SOCKET notify:new
    const io = req.app.get('io');
    if (io) {
      const payload = {
        id: newId,
        type: loai,
        message: noiDung,
        time: time, // Hoặc new Date().toISOString()
      };
      io.to(`user:${toUserId}`).emit('notify:new', payload);
    }

    res.json({ ok: true, id: newId });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ===================================================================
// 3. ĐÁNH DẤU ĐÃ ĐỌC
// ===================================================================
r.post('/read/:id', auth, async (req, res) => {
  try {
    const sql = `
      UPDATE "ThongBao" 
      SET "DaDoc" = 1 
      WHERE "IDThongBao" = $1 AND "IDNguoiNhan" = $2
    `;

    await query(sql, [Number(req.params.id), req.user.uid]);
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

export default r;