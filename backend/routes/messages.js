// routes/messages.js
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { auth as protect } from '../middleware/auth.js'
import { query } from '../src/db.js'
import { uploadChat } from '../middleware/uploadChat.js'

const r = Router()

// ===================================================================
// 1. DANH SÁCH CÁC CUỘC CHAT (/api/messages)
// ===================================================================
r.get('/', protect, async (req, res) => {
  const userMe = req.user.uid

  try {
    // PostgreSQL: Dùng $1 cho tham số, CASE WHEN thay cho IIF
    const sql = `
      WITH AllMessages AS (
        SELECT 
          "IDTinNhan",
          "NoiDung",
          "ThoiGian",
          "NguoiGui",
          "NguoiNhan",
          "HinhAnh",
          "IDBaiDang",
          CASE 
            WHEN "NguoiGui" = $1 THEN "NguoiNhan" 
            ELSE "NguoiGui" 
          END AS "PartnerID"
        FROM "TinNhan"
        WHERE "NguoiGui" = $1 OR "NguoiNhan" = $1
      ),
      RankedMessages AS (
        SELECT 
          "IDTinNhan",
          "NoiDung",
          "ThoiGian",
          "NguoiGui",
          "NguoiNhan",
          "HinhAnh",
          "IDBaiDang",
          "PartnerID",
          ROW_NUMBER() OVER (
            PARTITION BY "PartnerID"
            ORDER BY "ThoiGian" DESC
          ) AS rn
        FROM AllMessages
      )
      SELECT 
        r."PartnerID"    AS id,
        u."TenDangNhap"  AS name,
        u."AvatarUrl"    AS avatar,

        r."NoiDung"      AS "lastMessage",
        r."ThoiGian"     AS "lastAt",
        r."NguoiGui"     AS "lastFrom",

        r."HinhAnh"      AS "lastImageUrl",
        CASE WHEN r."HinhAnh" IS NULL THEN 0 ELSE 1 END AS "lastHasImage",

        r."IDBaiDang"    AS "lastPostId",
        CASE WHEN r."IDBaiDang" IS NULL THEN 0 ELSE 1 END AS "lastHasPost"

      FROM RankedMessages r
      JOIN "NguoiDung" u ON u."IDNguoiDung" = r."PartnerID"
      WHERE r.rn = 1
      ORDER BY r."ThoiGian" DESC;
    `

    const rs = await query(sql, [userMe])

    // Postgres trả về mảng row trong thuộc tính 'rows'
    const chats = rs.rows.map((row) => ({
      id: row.id,
      lastMessage: row.lastMessage,
      lastAt: row.lastAt,
      lastFrom: row.lastFrom,

      lastImageUrl: row.lastImageUrl,
      lastHasImage: !!row.lastHasImage,

      lastPostId: row.lastPostId,
      lastHasPost: !!row.lastHasPost,

      withUser: {
        id: row.id,
        name: row.name,
        avatar: row.avatar || null,
      },
    }))

    res.json(chats)
  } catch (err) {
    console.error('Error fetching chat list:', err)
    res.status(500).json({ error: 'Failed to retrieve chat list.' })
  }
})

// ===================================================================
// 2. LỊCH SỬ 1 CUỘC CHAT (/api/messages/:otherId)
// ===================================================================
r.get('/:otherId', protect, async (req, res) => {
  const me = req.user.uid
  const otherId = Number(req.params.otherId)

  if (!Number.isFinite(otherId)) {
    return res.status(400).json({ error: 'Invalid otherId' })
  }

  try {
    // 2.1 Lấy lịch sử tin nhắn
    // Tham số $1 = me, $2 = otherId
    const sqlMessages = `
      SELECT 
        t."IDTinNhan",
        t."NguoiGui",
        t."NguoiNhan",
        t."NoiDung",
        t."HinhAnh",
        t."ThoiGian",
        t."IDBaiDang",
        b."TieuDe" AS "PostTitle",
        b."Gia"    AS "PostPrice"
      FROM "TinNhan" t
      LEFT JOIN "BaiDang" b ON b."IDBaiDang" = t."IDBaiDang"
      WHERE (t."NguoiGui" = $1 AND t."NguoiNhan" = $2)
         OR (t."NguoiGui" = $2 AND t."NguoiNhan" = $1)
      ORDER BY t."ThoiGian" ASC;
    `
    
    const rs = await query(sqlMessages, [me, otherId])

    const messages = rs.rows.map((r) => ({
      id: r.IDTinNhan,
      text: r.NoiDung,
      at: r.ThoiGian,
      me: r.NguoiGui === me,
      imageUrl: r.HinhAnh || null,
      post: r.IDBaiDang
        ? {
            id: r.IDBaiDang,
            title: r.PostTitle,
            price: r.PostPrice,
            thumb: null, 
          }
        : null,
    }))

    // 2.2 Lấy thông tin người còn lại
    const sqlUser = `
      SELECT "IDNguoiDung", "TenDangNhap", "AvatarUrl"
      FROM "NguoiDung"
      WHERE "IDNguoiDung" = $1;
    `
    const userRs = await query(sqlUser, [otherId])
    const other = userRs.rows[0]

    const withUser = {
      id: otherId,
      name: other?.TenDangNhap || `User #${otherId}`,
      avatar: other?.AvatarUrl || null,
    }

    res.json({ withUser, messages })
  } catch (err) {
    console.error('Error fetching chat history:', err)
    res.status(500).json({ error: 'Failed to load chat' })
  }
})

// ===================================================================
// 3. ĐÁNH DẤU ĐÃ ĐỌC (/api/messages/read/:fromUserId)
// ===================================================================
r.post('/read/:fromUserId', protect, async (req, res) => {
  const userMe = req.user.uid
  const userFrom = Number(req.params.fromUserId)

  try {
    // $1 = userFrom, $2 = userMe
    // PostgreSQL trả về rowCount để biết số dòng bị ảnh hưởng
    const sql = `
      UPDATE "TinNhan"
      SET "DaDoc" = 1
      WHERE "NguoiGui" = $1 AND "NguoiNhan" = $2 AND "DaDoc" = 0;
    `
    const rs = await query(sql, [userFrom, userMe])

    res.json({ ok: true, messagesAffected: rs.rowCount })
  } catch (err) {
    console.error('Error marking as read:', err)
    res.status(500).json({ error: 'Failed to mark messages as read.' })
  }
})

// ===================================================================
// 4. GỬI TIN NHẮN KÈM HÌNH ẢNH (/api/messages/upload)
// ===================================================================
r.post(
  '/upload',
  protect,
  uploadChat.single('image'),
  async (req, res) => {
    const me = req.user.uid
    const { to, text, idBaiDang } = req.body
    const file = req.file

    if (!to || !file) {
      return res.status(400).json({ error: 'Thiếu dữ liệu' })
    }

    const imagePath = `/uploads/chat/${file.filename}`
    const postId = idBaiDang ? Number(idBaiDang) : null
    const textContent = text || ''

    try {
      // Dùng RETURNING để lấy lại ID và Thời gian sau khi insert
      // $1=me, $2=to, $3=text, $4=img, $5=postId
      const sql = `
        INSERT INTO "TinNhan"
          ("NguoiGui", "NguoiNhan", "NoiDung", "ThoiGian", "DaDoc", "HinhAnh", "IDBaiDang")
        VALUES
          ($1, $2, $3, NOW(), 0, $4, $5)
        RETURNING "IDTinNhan", "ThoiGian", "IDBaiDang";
      `

      const rs = await query(sql, [me, Number(to), textContent, imagePath, postId])
      const row = rs.rows[0]

      const payload = {
        id: row.IDTinNhan,
        from: me,
        to: Number(to),
        text: textContent,
        at: row.ThoiGian,
        imageUrl: imagePath,
        post: row.IDBaiDang ? { id: row.IDBaiDang } : null,
      }

      const io = req.app.get('io')
      io.to(`user:${to}`).emit('message:new', payload)
      io.to(`user:${me}`).emit('message:new', payload)

      res.json(payload)
    } catch (err) {
      console.error('Error uploading image message:', err)
      res.status(500).json({ error: 'Failed to upload image message' })
    }
  },
)

// ===================================================================
// 5. GỬI TIN NHẮN TEXT (CÓ THỂ KÈM ID BÀI ĐĂNG) (/api/messages/:otherUserId)
// ===================================================================
r.post(
  '/:otherUserId',
  protect,
  body('noiDung').optional().isString().trim(),
  async (req, res) => {
    const me = req.user.uid
    const otherId = Number(req.params.otherUserId)
    const { noiDung, idBaiDang } = req.body

    if (!Number.isFinite(otherId)) {
      return res.status(400).json({ error: 'Invalid otherUserId' })
    }
    if (!noiDung && !idBaiDang) {
      return res.status(400).json({ error: 'Thiếu nội dung hoặc idBaiDang' })
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const textContent = noiDung || ''
    const postId = idBaiDang || null

    try {
      // Dùng RETURNING
      // $1=me, $2=otherId, $3=textContent, $4=postId
      const sql = `
        INSERT INTO "TinNhan"
          ("NguoiGui", "NguoiNhan", "NoiDung", "ThoiGian", "DaDoc", "IDBaiDang")
        VALUES
          ($1, $2, $3, NOW(), 0, $4)
        RETURNING "IDTinNhan", "ThoiGian";
      `

      const rs = await query(sql, [me, otherId, textContent, postId])
      const row = rs.rows[0]

      const payload = {
        id: row.IDTinNhan,
        from: me,
        to: otherId,
        text: textContent,
        at: row.ThoiGian,
        post: idBaiDang ? { id: idBaiDang } : null,
      }

      const io = req.app.get('io')
      io.to(`user:${otherId}`).emit('message:new', payload)
      io.to(`user:${me}`).emit('message:new', payload)

      res.status(201).json({ ok: true, data: payload })
    } catch (err) {
      console.error('Error sending message:', err)
      res.status(500).json({ error: 'Failed to send message.' })
    }
  },
)

export default r