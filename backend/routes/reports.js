import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../src/db.js';

const r = Router();

r.post('/:postId', auth, async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.user.uid;
  const lyDo = req.body.lyDo || '';

  try {
    // $1 = postId, $2 = userId, $3 = lyDo
    const sql = `
      INSERT INTO "BaoCao"("IDBaiDang", "IDNguoiDung", "LyDo", "NgayBaoCao", "TrangThai")
      VALUES($1, $2, $3, NOW(), 'ChoXuLy')
    `;

    await query(sql, [postId, userId, lyDo]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Error reporting post:', err);
    res.status(500).json({ error: 'Failed to report post' });
  }
});

export default r;