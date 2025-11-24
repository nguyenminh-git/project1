import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { query } from '../src/db.js'
import { auth as protect } from '../middleware/auth.js'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const r = Router()

// -----------------------------------------------------
// 📌 MULTER – LƯU ẢNH
// -----------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'images')
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uid = req.user?.uid ?? 'guest'
    cb(null, `${Date.now()}-${uid}-${file.fieldname}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('images', 8)


// -----------------------------------------------------
// 📌 1. LẤY DANH SÁCH BÀI ĐĂNG (PUBLIC)
// -----------------------------------------------------
r.get('/', async (req, res) => {
  try {
    const categoryFilter = req.query.category || null

    let sql = `
      SELECT TOP 100
        bd.IDBaiDang AS id,
        bd.TieuDe AS title,
        bd.Gia AS price,
        bd.ViTri,
        bd.NgayDang,
        bd.TrangThai,
        dm.TenDanhMuc AS category,
        nd.TenDangNhap AS sellerName,
        (
          SELECT TOP 1 Url FROM dbo.HinhAnh 
          WHERE IDBaiDang = bd.IDBaiDang ORDER BY ThuTu
        ) AS thumb
      FROM dbo.BaiDang bd
      JOIN dbo.NguoiDung nd ON nd.IDNguoiDung = bd.IDNguoiDung
      JOIN dbo.DanhMuc dm ON dm.IDDanhMuc = bd.IDDanhMuc
      WHERE 1=1
    `

    const params = (rq, sqlType) => {}

    if (categoryFilter) {
      sql += ` AND dm.TenDanhMuc = @cat `
      params = (rq, sqlType) => {
        rq.input('cat', sqlType.NVarChar(100), categoryFilter)
      }
    }

    sql += ` ORDER BY bd.NgayDang DESC `

    const rs = await query(sql, params)

    res.json(
      rs.recordset.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price) || 0,
        category: p.category,
        condition: 'Mới 99%',
        images: p.thumb ? [p.thumb] : [],
        seller: p.sellerName,
        location: p.ViTri,
        status: p.TrangThai,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Cannot load posts.' })
  }
})


// -----------------------------------------------------
// 📌 2. CHI TIẾT BÀI ĐĂNG (PUBLIC)
// -----------------------------------------------------
r.get('/:id', async (req, res) => {
  const id = Number(req.params.id)

  try {
    const postRs = await query(`
      SELECT 
        bd.IDBaiDang AS id,
        bd.TieuDe AS title,
        bd.MoTa AS description,
        bd.Gia AS price,
        bd.ViTri AS location,
        bd.NgayDang,
        bd.TrangThai,
        dm.TenDanhMuc AS category,
        nd.IDNguoiDung AS sellerId,
        nd.TenDangNhap AS sellerName
      FROM dbo.BaiDang bd
      JOIN dbo.NguoiDung nd ON nd.IDNguoiDung = bd.IDNguoiDung
      JOIN dbo.DanhMuc dm ON dm.IDDanhMuc = bd.IDDanhMuc
      WHERE bd.IDBaiDang = @id
    `, (rq, sql) => {
      rq.input('id', sql.Int, id)
    })

    if (postRs.recordset.length === 0) {
      return res.status(404).json({ error: 'Post not found.' })
    }

    const post = postRs.recordset[0]

    const imgRs = await query(`
      SELECT Url FROM dbo.HinhAnh WHERE IDBaiDang = @id ORDER BY ThuTu
    `, (rq, sql) => {
      rq.input('id', sql.Int, id)
    })

    res.json({
      ...post,
      price: Number(post.price),
      condition: 'Mới 99%',
      images: imgRs.recordset.map((i) => i.Url),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Cannot load post detail.' })
  }
})


// -----------------------------------------------------
// 📌 3. ĐĂNG BÀI (LOGIN REQUIRED)
// -----------------------------------------------------
r.post(
  '/',
  protect,
  upload,
  body('TieuDe').isLength({ min: 3 }).trim(),
  body('IDDanhMuc').isInt(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.files?.length) {
      return res.status(400).json({ error: 'At least 1 image required.' })
    }

    try {
      const { TieuDe, MoTa, Gia, ViTri, IDDanhMuc } = req.body

      const rs = await query(`
        INSERT INTO dbo.BaiDang 
          (IDNguoiDung, IDDanhMuc, TieuDe, MoTa, Gia, ViTri)
        VALUES (@uid, @cat, @title, @desc, @price, @loc)
        SELECT SCOPE_IDENTITY() AS id
      `, (rq, sql) => {
        rq.input('uid', sql.Int, req.user.uid)
        rq.input('cat', sql.Int, IDDanhMuc)
        rq.input('title', sql.NVarChar(255), TieuDe)
        rq.input('desc', sql.NVarChar(sql.MAX), MoTa || null)
        rq.input('price', sql.Decimal(18, 2), Gia || 0)
        rq.input('loc', sql.NVarChar(255), ViTri || null)
      })

      const postId = rs.recordset[0].id

      let order = 1
      for (const f of req.files) {
        await query(`
          INSERT INTO dbo.HinhAnh (IDBaiDang, Url, ThuTu)
          VALUES (@post, @url, @o)
        `, (rq, sql) => {
          rq.input('post', sql.Int, postId)
          rq.input('url', sql.NVarChar(500), `/uploads/images/${f.filename}`)
          rq.input('o', sql.Int, order++)
        })
      }

      res.status(201).json({ ok: true, id: postId })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Cannot create post.' })
    }
  }
)


// -----------------------------------------------------
// 📌 4. UPDATE TRẠNG THÁI BÀI ĐĂNG
// -----------------------------------------------------
r.post('/:id/status', protect, async (req, res) => {
  const postId = Number(req.params.id)
  const { status } = req.body
  const userId = req.user.uid

  const allowed = ['ConHang', 'DaBan', 'DaTraoDoi', 'BiKhoa']
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' })
  }

  try {
    const rs = await query(`
      UPDATE dbo.BaiDang
      SET TrangThai = @st, NgayCapNhat = SYSUTCDATETIME()
      WHERE IDBaiDang = @id AND IDNguoiDung = @uid
    `, (rq, sql) => {
      rq.input('id', sql.Int, postId)
      rq.input('uid', sql.Int, userId)
      rq.input('st', sql.NVarChar(20), status)
    })

    if (rs.rowsAffected[0] === 0) {
      return res.status(400).json({ error: 'Not allowed.' })
    }

    res.json({ ok: true, status })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Cannot update status.' })
  }
})


// -----------------------------------------------------
// 📌 5. CHỐT BÁN (NÚT "CHỐT ĐƠN")
// -----------------------------------------------------
r.post('/:id/mark-sold', protect, async (req, res) => {
  const postId = Number(req.params.id)
  const userId = req.user.uid
  const buyerId = req.body.buyerId || null

  try {
    const rs = await query(`
      UPDATE dbo.BaiDang
      SET TrangThai = N'DaBan', NgayCapNhat = SYSUTCDATETIME()
      WHERE IDBaiDang = @id AND IDNguoiDung = @uid AND TrangThai = N'ConHang'
    `, (rq, sql) => {
      rq.input('id', sql.Int, postId)
      rq.input('uid', sql.Int, userId)
    })

    if (rs.rowsAffected[0] === 0) {
      return res
        .status(400)
        .json({ error: 'Bạn không có quyền hoặc bài đã bán.' })
    }

    if (buyerId) {
      await query(`
        INSERT INTO dbo.ThongBao(IDNguoiNhan, LoaiThongBao, NoiDung, DaDoc, ThoiGian)
        VALUES(@to, N'CHOT_BAN', N'Người bán đã chốt đơn cho bạn', 0, SYSUTCDATETIME())
      `, (rq, sql) => {
        rq.input('to', sql.Int, buyerId)
      })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Không chốt bán được.' })
  }
})


// -----------------------------------------------------
// 📌 6. XOÁ BÀI (LOGIN REQUIRED)
// -----------------------------------------------------
r.delete('/:id', protect, async (req, res) => {
  const id = Number(req.params.id)
  const uid = req.user.uid

  try {
    const rs = await query(`
      DELETE FROM dbo.BaiDang 
      WHERE IDBaiDang = @id AND IDNguoiDung = @uid
    `, (rq, sql) => {
      rq.input('id', sql.Int, id)
      rq.input('uid', sql.Int, uid)
    })

    if (rs.rowsAffected[0] === 0) {
      return res.status(400).json({ error: 'Not allowed.' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Cannot delete post.' })
  }
})

export default r
