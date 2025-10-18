import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../db.js';

const r = Router();

// Search & filter
r.get('/', async (req,res)=>{
  const { q, cat, min, max, status, near, page=1, size=20 } = req.query;
  const off = (page-1)*size;

  const rs = await query(`
   SELECT b.IDBaiDang, b.TieuDe, b.Gia, b.ViTri, b.TrangThai, b.NgayDang, d.TenDanhMuc
   FROM dbo.BaiDang b
   JOIN dbo.DanhMuc d ON d.IDDanhMuc=b.IDDanhMuc
   WHERE (@q IS NULL OR b.TieuDe LIKE N'%'+@q+'%' OR b.MoTa LIKE N'%'+@q+'%')
     AND (@cat IS NULL OR b.IDDanhMuc=@cat)
     AND (@min IS NULL OR b.Gia >= @min)
     AND (@max IS NULL OR b.Gia <= @max)
     AND (@st  IS NULL OR b.TrangThai=@st)
     AND (@near IS NULL OR b.ViTri LIKE N'%'+@near+'%')
   ORDER BY b.NgayDang DESC
   OFFSET @off ROWS FETCH NEXT @size ROWS ONLY`,
   (rq, sql)=>{
     rq.input('q', sql.NVarChar(255), q ?? null);
     rq.input('cat', sql.Int, cat ? Number(cat) : null);
     rq.input('min', sql.Decimal(18,2), min ?? null);
     rq.input('max', sql.Decimal(18,2), max ?? null);
     rq.input('st', sql.NVarChar(30), status ?? null);
     rq.input('near', sql.NVarChar(255), near ?? null);
     rq.input('off', sql.Int, Number(off));
     rq.input('size', sql.Int, Number(size));
   });
  res.json(rs.recordset);
});

// Gợi ý thông minh: lấy 10 bài cùng danh mục/vị trí gần với lịch sử tìm kiếm mới nhất của user
r.get('/suggestions', auth, async (req,res)=>{
  // giả sử lưu KEYWORD vào AuditLog.Entity='SEARCH', OldValue=null, NewValue='keyword|near|cat'
  const last = await query(`
    SELECT TOP 1 NewValue FROM dbo.AuditLog
    WHERE IDNguoiDung=@uid AND Entity=N'SEARCH'
    ORDER BY ThoiGian DESC`, (rq, sql)=>rq.input('uid', sql.Int, req.user.uid));
  let k=null, near=null, cat=null;
  if (last.recordset.length){
    const parts = String(last.recordset[0].NewValue).split('|');
    k = parts[0]||null; near = parts[1]||null; cat = parts[2] ? Number(parts[2]) : null;
  }
  const rs = await query(`
   SELECT TOP 10 b.IDBaiDang, b.TieuDe, b.Gia, d.TenDanhMuc
   FROM dbo.BaiDang b JOIN dbo.DanhMuc d ON d.IDDanhMuc=b.IDDanhMuc
   WHERE (@cat IS NULL OR b.IDDanhMuc=@cat)
     AND (@near IS NULL OR b.ViTri LIKE N'%'+@near+'%')
     AND (@k IS NULL OR b.TieuDe LIKE N'%'+@k+'%' OR b.MoTa LIKE N'%'+@k+'%')
   ORDER BY b.NgayCapNhat DESC`,
   (rq, sql)=>{ rq.input('cat', sql.Int, cat); rq.input('near', sql.NVarChar(255), near); rq.input('k', sql.NVarChar(255), k); });
  res.json(rs.recordset);
});

export default r;
