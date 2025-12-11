import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../src/db.js';

const r = Router();

// Thêm bài vào danh sách yêu thích
r.post('/:postId', auth, async (req, res) => {
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'postId không hợp lệ.' });
  }

  // Bảng "YeuThich" đã có UNIQUE("IDNguoiDung","IDBaiDang") → dùng ON CONFLICT
  await query(
    `
    INSERT INTO "YeuThich"("IDNguoiDung","IDBaiDang","ThoiGian")
    VALUES ($1, $2, NOW())
    ON CONFLICT ("IDNguoiDung","IDBaiDang") DO NOTHING
    `,
    [req.user.uid, postId]
  );

  res.json({ ok: true });
});

// Bỏ khỏi yêu thích
r.delete('/:postId', auth, async (req, res) => {
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'postId không hợp lệ.' });
  }

  await query(
    `
    DELETE FROM "YeuThich"
    WHERE "IDNguoiDung" = $1 AND "IDBaiDang" = $2
    `,
    [req.user.uid, postId]
  );

  res.json({ ok: true });
});

// Lấy danh sách bài yêu thích của user hiện tại
r.get('/', auth, async (req, res) => {
  const rs = await query(
    `
    SELECT 
      y."IDBaiDang",
      b."TieuDe",
      b."Gia"
    FROM "YeuThich" y
    JOIN "BaiDang" b ON b."IDBaiDang" = y."IDBaiDang"
    WHERE y."IDNguoiDung" = $1
    ORDER BY y."ThoiGian" DESC
    `,
    [req.user.uid]
  );

  res.json(rs.rows); // pg: dữ liệu nằm trong rows
});

export default r;
