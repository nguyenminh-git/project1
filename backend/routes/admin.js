import { Router } from 'express';
import { query } from '../src/db.js';

const r = Router();

r.get('/users', async (req, res) => {
  try {
    const rs = await query(`
      SELECT 
        "IDNguoiDung",
        "TenDangNhap",
        "Email",
        "VaiTro",
        "TrangThai",
        "NgayTao"
      FROM "NguoiDung"
      ORDER BY "NgayTao" DESC;
    `);

    res.json(rs.rows); // pg: dữ liệu nằm trong rs.rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

r.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body; // status = true (mở) hoặc false (khóa)
  const { id } = req.params;

  if (typeof status !== 'boolean') {
    return res.status(400).json({ error: 'Status must be a boolean (true/false).' });
  }

  try {
    const rs = await query(
      `
        UPDATE "NguoiDung"
        SET "TrangThai" = $1
        WHERE "IDNguoiDung" = $2;
      `,
      [status, id] // $1 = status, $2 = id
    );

    if (rs.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      ok: true,
      message: `User ${id} status updated to ${status ? 'Active' : 'Blocked'}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// ----------------------------------------------------------------------
// B. Quản lý Báo cáo (Reports)
// ----------------------------------------------------------------------

// Lấy danh sách tất cả các báo cáo (sắp xếp theo trạng thái chưa xử lý lên đầu)
r.get('/reports', async (req, res) => {
  try {
    const rs = await query(`
      SELECT 
        r.*,
        b."TieuDe"      AS "BaiDangTieuDe",
        n."TenDangNhap" AS "NguoiBaoCao"
      FROM "BaoCao" r
      JOIN "BaiDang" b ON b."IDBaiDang" = r."IDBaiDang"
      JOIN "NguoiDung" n ON n."IDNguoiDung" = r."IDNguoiDung"
      ORDER BY 
        CASE WHEN r."TrangThai" = 'ChoXuLy' THEN 0 ELSE 1 END,
        r."NgayBaoCao" DESC;
    `);

    res.json(rs.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

// Cập nhật trạng thái báo cáo (ChoXuLy, DaXuLy, TuChoi)
r.patch('/reports/:id/status', async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!['ChoXuLy', 'DaXuLy', 'TuChoi'].includes(status)) {
    return res.status(400).json({ error: 'Invalid report status.' });
  }

  try {
    const rs = await query(
      `
        UPDATE "BaoCao"
        SET "TrangThai" = $1
        WHERE "IDBaoCao" = $2;
      `,
      [status, id]
    );

    if (rs.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    res.json({ ok: true, message: `Report ${id} status updated to ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update report status.' });
  }
});

// ----------------------------------------------------------------------
// C. Xử lý Bài đăng (Posts)
// ----------------------------------------------------------------------

// Xóa bài đăng (thường là sau khi admin duyệt báo cáo)
r.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rs = await query(
      `
        DELETE FROM "BaiDang"
        WHERE "IDBaiDang" = $1;
      `,
      [id]
    );

    if (rs.rowCount === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({ ok: true, message: `Post ${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// Lấy danh sách bài đăng cho admin xem tổng quan
r.get('/posts', async (req, res) => {
  try {
    const rs = await query(`
      SELECT 
        b."IDBaiDang",
        b."TieuDe",
        b."Gia",
        b."NgayDang",
        b."TrangThai",
        u."TenDangNhap" AS "SellerName",
        COUNT(DISTINCT bc."IDBaoCao") AS "ReportCount"
      FROM "BaiDang" b
      JOIN "NguoiDung" u ON u."IDNguoiDung" = b."IDNguoiDung"
      LEFT JOIN "BaoCao" bc ON bc."IDBaiDang" = b."IDBaiDang"
      GROUP BY 
        b."IDBaiDang",
        b."TieuDe",
        b."Gia",
        b."NgayDang",
        b."TrangThai",
        u."TenDangNhap"
      ORDER BY b."NgayDang" DESC;
    `);

    res.json(rs.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve posts for admin.' });
  }
});

// ----------------------------------------------------------------------
// E. Thống kê nhanh cho Admin
// GET /api/admin/stats
// ----------------------------------------------------------------------
r.get('/stats', async (req, res) => {
  try {
    const rs = await query(`
      SELECT
        (SELECT COUNT(*) FROM "BaiDang") AS "TotalPosts",
        (SELECT COUNT(*) FROM "BaiDang" WHERE "TrangThai" = 'ConHang') AS "ApprovedPosts",
        (SELECT COUNT(*) FROM "BaiDang" WHERE "TrangThai" = 'ChoDuyet') AS "PendingPosts",
        (SELECT COUNT(*) FROM "BaoCao"  WHERE "TrangThai" = 'ChoXuLy') AS "PendingReports",
        (SELECT COUNT(*) FROM "NguoiDung" WHERE "TrangThai" = TRUE) AS "ActiveUsers";
    `);

    res.json(rs.rows[0]); // lấy một dòng duy nhất
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

export default r;
