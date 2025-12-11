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
// 📌 MULTER – LƯU ẢNH (GIỮ NGUYÊN)
// -----------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Đảm bảo thư mục này tồn tại
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
    const queryParams = []

    // Postgres: Dùng LIMIT thay cho TOP
    // Subquery: Dùng LIMIT 1 thay cho TOP 1
    let sql = `
      SELECT 
        bd."IDBaiDang" AS id,
        bd."TieuDe"    AS title,
        bd."Gia"       AS price,
        bd."ViTri",
        bd."NgayDang",
        bd."TrangThai",
        dm."TenDanhMuc" AS category,
        nd."TenDangNhap" AS "sellerName",
        (
          SELECT "Url" FROM "HinhAnh" 
          WHERE "IDBaiDang" = bd."IDBaiDang" 
          ORDER BY "ThuTu" ASC
          LIMIT 1
        ) AS thumb
      FROM "BaiDang" bd
      JOIN "NguoiDung" nd ON nd."IDNguoiDung" = bd."IDNguoiDung"
      JOIN "DanhMuc" dm ON dm."IDDanhMuc" = bd."IDDanhMuc"
      WHERE 1=1
    `

    if (categoryFilter) {
      queryParams.push(categoryFilter)
      sql += ` AND dm."TenDanhMuc" = $${queryParams.length} `
    }

    sql += ` ORDER BY bd."NgayDang" DESC LIMIT 100 `

    const rs = await query(sql, queryParams)

    res.json(
      rs.rows.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price) || 0,
        category: p.category,
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
    const postSql = `
      SELECT 
        bd."IDBaiDang"   AS id,
        bd."TieuDe"      AS title,
        bd."MoTa"        AS description,
        bd."Gia"         AS price,
        bd."ViTri"       AS location,
        bd."NgayDang",
        bd."TrangThai",
        dm."TenDanhMuc"  AS category,
        nd."IDNguoiDung" AS "sellerId",
        nd."TenDangNhap" AS "sellerName"
      FROM "BaiDang" bd
      JOIN "NguoiDung" nd ON nd."IDNguoiDung" = bd."IDNguoiDung"
      JOIN "DanhMuc" dm ON dm."IDDanhMuc" = bd."IDDanhMuc"
      WHERE bd."IDBaiDang" = $1
    `
    const postRs = await query(postSql, [id])

    if (postRs.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' })
    }

    const post = postRs.rows[0]

    const imgSql = `
      SELECT "Url" FROM "HinhAnh" WHERE "IDBaiDang" = $1 ORDER BY "ThuTu"
    `
    const imgRs = await query(imgSql, [id])

    res.json({
      ...post,
      price: Number(post.price),
      images: imgRs.rows.map((i) => i.Url),
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

      // Postgres: INSERT ... RETURNING "IDBaiDang"
      const insertPostSql = `
        INSERT INTO "BaiDang" 
          ("IDNguoiDung", "IDDanhMuc", "TieuDe", "MoTa", "Gia", "ViTri")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING "IDBaiDang" AS id
      `
      
      const rs = await query(insertPostSql, [
        req.user.uid,
        IDDanhMuc,
        TieuDe,
        MoTa || null,
        Gia || 0,
        ViTri || null
      ])

      const postId = rs.rows[0].id

      // Lưu hình ảnh
      let order = 1
      for (const f of req.files) {
        const insertImgSql = `
          INSERT INTO "HinhAnh" ("IDBaiDang", "Url", "ThuTu")
          VALUES ($1, $2, $3)
        `
        const imgUrl = `/uploads/images/${f.filename}`
        await query(insertImgSql, [postId, imgUrl, order++])
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
    // Postgres: Dùng NOW() thay SYSUTCDATETIME()
    const sql = `
      UPDATE "BaiDang"
      SET "TrangThai" = $1, "NgayCapNhat" = NOW()
      WHERE "IDBaiDang" = $2 AND "IDNguoiDung" = $3
    `
    const rs = await query(sql, [status, postId, userId])

    // Postgres: Dùng rowCount
    if (rs.rowCount === 0) {
      return res.status(400).json({ error: 'Not allowed or post not found.' })
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
    // Postgres không cần N'String' cho unicode
    const sqlUpdate = `
      UPDATE "BaiDang"
      SET "TrangThai" = 'DaBan', "NgayCapNhat" = NOW()
      WHERE "IDBaiDang" = $1 AND "IDNguoiDung" = $2 AND "TrangThai" = 'ConHang'
    `
    const rs = await query(sqlUpdate, [postId, userId])

    if (rs.rowCount === 0) {
      return res
        .status(400)
        .json({ error: 'Bạn không có quyền hoặc bài đã bán.' })
    }

    if (buyerId) {
      const sqlNoti = `
        INSERT INTO "ThongBao"("IDNguoiNhan", "LoaiThongBao", "NoiDung", "DaDoc", "ThoiGian")
        VALUES($1, 'CHOT_BAN', 'Người bán đã chốt đơn cho bạn', 0, NOW())
      `
      await query(sqlNoti, [buyerId])
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
    const sql = `
      DELETE FROM "BaiDang" 
      WHERE "IDBaiDang" = $1 AND "IDNguoiDung" = $2
    `
    const rs = await query(sql, [id, uid])

    if (rs.rowCount === 0) {
      return res.status(400).json({ error: 'Not allowed or post not found.' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Cannot delete post.' })
  }
})

export default r