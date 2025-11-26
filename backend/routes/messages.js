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
    const rs = await query(
      `
      ;WITH AllMessages AS (
        SELECT 
          IDTinNhan,
          NoiDung,
          ThoiGian,
          NguoiGui,
          NguoiNhan,
          HinhAnh,
          IDBaiDang,
          IIF(NguoiGui = @me, NguoiNhan, NguoiGui) AS PartnerID
        FROM dbo.TinNhan
        WHERE NguoiGui = @me OR NguoiNhan = @me
      ),
      RankedMessages AS (
        SELECT 
          IDTinNhan,
          NoiDung,
          ThoiGian,
          NguoiGui,
          NguoiNhan,
          HinhAnh,
          IDBaiDang,
          PartnerID,
          ROW_NUMBER() OVER (
            PARTITION BY PartnerID
            ORDER BY ThoiGian DESC
          ) AS rn
        FROM AllMessages
      )
      SELECT 
        r.PartnerID    AS id,
        u.TenDangNhap  AS name,
        u.AvatarUrl    AS avatar,       -- dùng đúng cột AvatarUrl

        r.NoiDung      AS lastMessage,
        r.ThoiGian     AS lastAt,
        r.NguoiGui     AS lastFrom,     -- ai gửi tin cuối

        r.HinhAnh      AS lastImageUrl,
        CASE WHEN r.HinhAnh  IS NULL THEN 0 ELSE 1 END AS lastHasImage,

        r.IDBaiDang    AS lastPostId,
        CASE WHEN r.IDBaiDang IS NULL THEN 0 ELSE 1 END AS lastHasPost

      FROM RankedMessages r
      JOIN dbo.NguoiDung u ON u.IDNguoiDung = r.PartnerID
      WHERE r.rn = 1
      ORDER BY r.ThoiGian DESC;
    `,
      (rq, sql) => {
        rq.input('me', sql.Int, userMe)
      },
    )

    const chats = rs.recordset.map((row) => ({
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
    const rs = await query(
      `
      SELECT 
        t.IDTinNhan,
        t.NguoiGui,
        t.NguoiNhan,
        t.NoiDung,
        t.HinhAnh,
        t.ThoiGian,
        t.IDBaiDang,
        b.TieuDe AS PostTitle,
        b.Gia    AS PostPrice
      FROM dbo.TinNhan t
      LEFT JOIN dbo.BaiDang b ON b.IDBaiDang = t.IDBaiDang
      WHERE (t.NguoiGui = @me   AND t.NguoiNhan = @other)
         OR (t.NguoiGui = @other AND t.NguoiNhan = @me)
      ORDER BY t.ThoiGian ASC;
    `,
      (rq, sql) => {
        rq.input('me', sql.Int, me)
        rq.input('other', sql.Int, otherId)
      },
    )

    const messages = rs.recordset.map((r) => ({
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

    // 2.2 Lấy thông tin người còn lại (tên + avatar)
    const userRs = await query(
  `
  SELECT IDNguoiDung, TenDangNhap, AvatarUrl
  FROM dbo.NguoiDung
  WHERE IDNguoiDung = @id;
  `,
  (rq, sql) => {
    rq.input('id', sql.Int, otherId)
  },
)

const other = userRs.recordset[0]

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
    const rs = await query(
      `
      UPDATE dbo.TinNhan
      SET DaDoc = 1
      WHERE NguoiGui = @f AND NguoiNhan = @me AND DaDoc = 0;
    `,
      (rq, sql) => {
        rq.input('f', sql.Int, userFrom)
        rq.input('me', sql.Int, userMe)
      },
    )

    res.json({ ok: true, messagesAffected: rs.rowsAffected[0] })
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

    try {
      const rs = await query(
        `
        INSERT INTO dbo.TinNhan
          (NguoiGui, NguoiNhan, NoiDung, ThoiGian, DaDoc, HinhAnh, IDBaiDang)
        OUTPUT INSERTED.IDTinNhan, INSERTED.ThoiGian, INSERTED.IDBaiDang
        VALUES
          (@me, @to, @text, SYSUTCDATETIME(), 0, @img, @postId);
      `,
        (rq, sql) => {
          rq.input('me', sql.Int, me)
          rq.input('to', sql.Int, Number(to))
          rq.input('text', sql.NVarChar(sql.MAX), text || '')
          rq.input('img', sql.NVarChar(255), imagePath)
          rq.input('postId', sql.Int, postId)
        },
      )

      const row = rs.recordset[0]

      const payload = {
        id: row.IDTinNhan,
        from: me,
        to: Number(to),
        text: text || '',
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

    try {
      const rs = await query(
        `
        INSERT INTO dbo.TinNhan
          (NguoiGui, NguoiNhan, NoiDung, ThoiGian, DaDoc, IDBaiDang)
        OUTPUT INSERTED.IDTinNhan, INSERTED.ThoiGian
        VALUES
          (@from, @to, @c, SYSUTCDATETIME(), 0, @postId);
      `,
        (rq, sql) => {
          rq.input('from', sql.Int, me)
          rq.input('to', sql.Int, otherId)
          rq.input('c', sql.NVarChar(sql.MAX), noiDung || '')
          rq.input('postId', sql.Int, idBaiDang || null)
        },
      )

      const row = rs.recordset[0]

      const payload = {
        id: row.IDTinNhan,
        from: me,
        to: otherId,
        text: noiDung || '',
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
