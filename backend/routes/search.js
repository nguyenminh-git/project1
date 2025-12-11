import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../src/db.js';

const r = Router();

// ===================================================================
// 1. TÌM KIẾM & LỌC (SEARCH & FILTER)
// ===================================================================
r.get('/', async (req, res) => {
  const { q, cat, min, max, status, near, page = 1, size = 20 } = req.query;
  const limit = Number(size);
  const offset = (Number(page) - 1) * limit;

  // Chuẩn bị giá trị cho tham số (để null nếu không có giá trị)
  const pQ = q ? String(q) : null;
  const pCat = cat ? Number(cat) : null;
  const pMin = min ? Number(min) : null;
  const pMax = max ? Number(max) : null;
  const pStatus = status ? String(status) : null;
  const pNear = near ? String(near) : null;

  try {
    // $1=q, $2=cat, $3=min, $4=max, $5=status, $6=near, $7=limit, $8=offset
    // Dùng ILIKE để tìm kiếm không phân biệt hoa thường
    const sql = `
      SELECT 
        b."IDBaiDang", b."TieuDe", b."Gia", b."ViTri", b."TrangThai", b."NgayDang", d."TenDanhMuc"
      FROM "BaiDang" b
      JOIN "DanhMuc" d ON d."IDDanhMuc" = b."IDDanhMuc"
      WHERE ($1::text IS NULL OR b."TieuDe" ILIKE '%' || $1 || '%' OR b."MoTa" ILIKE '%' || $1 || '%')
        AND ($2::int IS NULL OR b."IDDanhMuc" = $2)
        AND ($3::numeric IS NULL OR b."Gia" >= $3)
        AND ($4::numeric IS NULL OR b."Gia" <= $4)
        AND ($5::text IS NULL OR b."TrangThai" = $5)
        AND ($6::text IS NULL OR b."ViTri" ILIKE '%' || $6 || '%')
      ORDER BY b."NgayDang" DESC
      LIMIT $7 OFFSET $8
    `;

    const rs = await query(sql, [pQ, pCat, pMin, pMax, pStatus, pNear, limit, offset]);
    
    res.json(rs.rows);
  } catch (err) {
    console.error('Error searching posts:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ===================================================================
// 2. GỢI Ý THÔNG MINH (SUGGESTIONS)
// ===================================================================
r.get('/suggestions', auth, async (req, res) => {
  try {
    // 2.1 Lấy lịch sử tìm kiếm gần nhất từ AuditLog
    // MSSQL: TOP 1 ...
    // Postgres: LIMIT 1
    const logSql = `
      SELECT "NewValue" FROM "AuditLog"
      WHERE "IDNguoiDung" = $1 AND "Entity" = 'SEARCH'
      ORDER BY "ThoiGian" DESC
      LIMIT 1
    `;
    
    const last = await query(logSql, [req.user.uid]);
    
    let k = null, near = null, cat = null;

    if (last.rows.length > 0) {
      // Giả sử NewValue lưu dạng: "keyword|location|categoryId"
      const parts = String(last.rows[0].NewValue).split('|');
      k = parts[0] || null;
      near = parts[1] || null;
      cat = parts[2] ? Number(parts[2]) : null;
    }

    // 2.2 Tìm các bài viết liên quan
    // $1=cat, $2=near, $3=k
    const suggestSql = `
      SELECT 
        b."IDBaiDang", b."TieuDe", b."Gia", d."TenDanhMuc"
      FROM "BaiDang" b 
      JOIN "DanhMuc" d ON d."IDDanhMuc" = b."IDDanhMuc"
      WHERE ($1::int IS NULL OR b."IDDanhMuc" = $1)
        AND ($2::text IS NULL OR b."ViTri" ILIKE '%' || $2 || '%')
        AND ($3::text IS NULL OR b."TieuDe" ILIKE '%' || $3 || '%' OR b."MoTa" ILIKE '%' || $3 || '%')
      ORDER BY b."NgayCapNhat" DESC
      LIMIT 10
    `;

    const rs = await query(suggestSql, [cat, near, k]);
    
    res.json(rs.rows);
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ error: 'Suggestion failed' });
  }
});

export default r;