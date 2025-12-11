import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../src/db.js';

const r = Router();

// Lấy danh sách comment của 1 bài đăng
r.get('/:postId', async (req, res) => {
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'postId không hợp lệ.' });
  }

  const rs = await query(
    `
    SELECT 
      c."IDBinhLuan",
      c."NoiDung",
      c."NgayBinhLuan",
      n."TenDangNhap"
    FROM "BinhLuan" c
    JOIN "NguoiDung" n ON n."IDNguoiDung" = c."IDNguoiDung"
    WHERE c."IDBaiDang" = $1
    ORDER BY c."NgayBinhLuan"
    `,
    [postId]
  );

  res.json(rs.rows); // pg dùng rows
});

// Thêm comment mới vào 1 bài đăng
r.post('/:postId', auth, async (req, res) => {
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'postId không hợp lệ.' });
  }

  const content = req.body?.noiDung?.toString().trim();
  if (!content) {
    return res.status(400).json({ error: 'Nội dung bình luận không được để trống.' });
  }

  await query(
    `
    INSERT INTO "BinhLuan"
      ("IDBaiDang","IDNguoiDung","NoiDung","NgayBinhLuan")
    VALUES ($1, $2, $3, NOW())
    `,
    [postId, req.user.uid, content]
  );

  res.json({ ok: true });
});

export default r;
