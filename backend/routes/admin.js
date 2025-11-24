import { Router } from 'express';
import { query } from '../src/db.js';
// Giả định bạn đã import protect và isAdmin từ file middleware/auth.js
// Tuy nhiên, chúng ta sẽ áp dụng chúng trong server.js cho toàn bộ /api/admin
// import { protect, isAdmin } from '../middleware/auth.js'; 

const r = Router();

// LƯU Ý: Tất cả các route trong file này sẽ được bảo vệ
// bởi middleware 'protect' và 'isAdmin' trong file server.js

// ----------------------------------------------------------------------
// A. Quản lý Người dùng (Users)
// ----------------------------------------------------------------------

// Lấy danh sách tất cả người dùng (chỉ thông tin cơ bản)
r.get('/users', async (req, res) => {
    try {
        const rs = await query(`
            SELECT IDNguoiDung, TenDangNhap, Email, VaiTro, TrangThai, NgayTao
            FROM dbo.NguoiDung
            ORDER BY NgayTao DESC;
        `);
        res.json(rs.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve users.' });
    }
});

// Khóa/Mở khóa tài khoản người dùng
r.patch('/users/:id/status', async (req, res) => {
    const { status } = req.body; // status = true (mở) hoặc false (khóa)
    const { id } = req.params;

    if (typeof status !== 'boolean') {
        return res.status(400).json({ error: 'Status must be a boolean (true/false).' });
    }

    try {
        const rs = await query(`
            UPDATE dbo.NguoiDung SET TrangThai = @status
            WHERE IDNguoiDung = @id;
        `, (rq, sql) => {
            rq.input('status', sql.Bit, status);
            rq.input('id', sql.Int, id);
        });

        if (rs.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ ok: true, message: `User ${id} status updated to ${status ? 'Active' : 'Blocked'}.` });
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
                r.*, b.TieuDe as BaiDangTieuDe, n.TenDangNhap as NguoiBaoCao
            FROM dbo.BaoCao r
            JOIN dbo.BaiDang b ON b.IDBaiDang = r.IDBaiDang
            JOIN dbo.NguoiDung n ON n.IDNguoiDung = r.IDNguoiDung
            ORDER BY 
                CASE r.TrangThai WHEN N'ChoXuLy' THEN 0 ELSE 1 END,
                r.NgayBaoCao DESC;
        `);
        res.json(rs.recordset);
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
        const rs = await query(`
            UPDATE dbo.BaoCao SET TrangThai = @status
            WHERE IDBaoCao = @id;
        `, (rq, sql) => {
            rq.input('status', sql.NVarChar(30), status);
            rq.input('id', sql.Int, id);
        });

        if (rs.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Report not found.' });
        }
        res.json({ ok: true, message: `Report ${id} status updated to ${status}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update report status.' });
    }
});

// ----------------------------------------------------------------------
// C. Xử lý Bài đăng (Posts) - Ví dụ: Xóa bài sau khi xem báo cáo
// ----------------------------------------------------------------------

// Xóa bài đăng (thường là sau khi admin duyệt báo cáo)
r.delete('/posts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const rs = await query(`
            DELETE FROM dbo.BaiDang
            WHERE IDBaiDang = @id;
        `, (rq, sql) => {
            rq.input('id', sql.Int, id);
        });

        if (rs.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Post not found.' });
        }
        res.json({ ok: true, message: `Post ${id} deleted successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

r.get('/posts', async (req, res) => {
  try {
    const rs = await query(`
      SELECT 
        b.IDBaiDang,
        b.TieuDe,
        b.Gia,
        b.NgayDang,
        b.TrangThai,
        u.HoTen        AS SellerName,
        COUNT(DISTINCT bc.IDBaoCao) AS ReportCount
      FROM dbo.BaiDang b
      JOIN dbo.NguoiDung u ON u.IDNguoiDung = b.IDNguoiDung
      LEFT JOIN dbo.BaoCao bc ON bc.IDBaiDang = b.IDBaiDang
      GROUP BY 
        b.IDBaiDang, b.TieuDe, b.Gia, b.NgayDang, b.TrangThai, u.HoTen
      ORDER BY b.NgayDang DESC;
    `);

    res.json(rs.recordset);
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
        (SELECT COUNT(*) FROM dbo.BaiDang) AS TotalPosts,
        (SELECT COUNT(*) FROM dbo.BaiDang WHERE TrangThai = N'ConHang') AS ApprovedPosts,
        (SELECT COUNT(*) FROM dbo.BaiDang WHERE TrangThai = N'ChoDuyet') AS PendingPosts,
        (SELECT COUNT(*) FROM dbo.BaoCao  WHERE TrangThai = N'ChoXuLy') AS PendingReports,
        (SELECT COUNT(*) FROM dbo.NguoiDung WHERE TrangThai = 1) AS ActiveUsers
    `);

    res.json(rs.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});
export default r;