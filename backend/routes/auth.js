import { Router } from 'express'
import { query } from '../src/db.js'
import { signAccess } from '../src/utils/jwt.js'
import crypto from 'crypto'
import { uploadAvatar } from '../middleware/uploadAvatar.js'

const r = Router()

// Định nghĩa độ dài salt và hash theo schema SQL
const HASH_LENGTH = 64
const SALT_LENGTH = 32
const ITERATIONS = 100000
const DIGEST = 'sha256'

// =====================================================
//  ĐĂNG KÝ (có upload avatar, validate thủ công)
// =====================================================
r.post('/register', uploadAvatar, async (req, res) => {
  try {
    const { username, password, email } = req.body || {}

    // ===== VALIDATE THỦ CÔNG =====

    // 1. Username: ít nhất 4 ký tự
    if (!username || typeof username !== 'string' || username.trim().length < 4) {
      return res.status(400).json({
        errors: [{ path: 'username', msg: 'Username phải có ít nhất 4 ký tự' }],
      })
    }

    // 2. Password: ít nhất 6 ký tự
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        errors: [{ path: 'password', msg: 'Password phải có ít nhất 6 ký tự' }],
      })
    }

    // 3. Email: kiểm tra đơn giản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({
        errors: [{ path: 'email', msg: 'Email không hợp lệ' }],
      })
    }

    const cleanUsername = username.trim()

    // ===== CHECK TRÙNG USERNAME / EMAIL =====
    const checkRs = await query(
      `SELECT 1 FROM dbo.NguoiDung WHERE TenDangNhap=@u OR Email=@e`,
      (reqDb, sql) => {
        reqDb.input('u', sql.NVarChar(50), cleanUsername)
        reqDb.input('e', sql.NVarChar(100), email)
      },
    )

    if (checkRs.recordset.length > 0) {
      return res
        .status(409)
        .json({ error: 'Username or Email already exists.' })
    }

    // ===== HASH PASSWORD =====
    const salt = crypto.randomBytes(SALT_LENGTH)
    const passHash = crypto.pbkdf2Sync(
      password,
      salt,
      ITERATIONS,
      HASH_LENGTH,
      DIGEST,
    )

    // ===== HANDLE AVATAR =====
    const avatarPath = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : null

    await query(
      `
      INSERT INTO dbo.NguoiDung 
        (TenDangNhap, MatKhauHash, PasswordSalt, Email, VaiTro, TrangThai, NgayTao, AvatarUrl)
      VALUES 
        (@u, @h, @s, @e, N'user', 1, SYSUTCDATETIME(), @avatar);
      `,
      (reqDb, sql) => {
        reqDb.input('u', sql.NVarChar(50), cleanUsername)
        reqDb.input('h', sql.VarBinary(HASH_LENGTH), passHash)
        reqDb.input('s', sql.VarBinary(SALT_LENGTH), salt)
        reqDb.input('e', sql.NVarChar(100), email)
        reqDb.input('avatar', sql.NVarChar(500), avatarPath)
      },
    )

    return res
      .status(201)
      .json({ ok: true, message: 'Registration successful.' })
  } catch (err) {
    console.error('Registration error:', err)
    return res
      .status(500)
      .json({ error: 'Internal server error while registering.' })
  }
})

// =====================================================
//  ĐĂNG NHẬP
// =====================================================
r.post('/login', async (req, res) => {
  // Frontend gửi 'username', dùng cho cả TenDangNhap HOẶC Email
  const { username, password } = req.body

  const rs = await query(
  `SELECT TOP 1 
      IDNguoiDung,
      TenDangNhap,
      MatKhauHash,
      PasswordSalt,
      VaiTro,
      TrangThai,
      Email,
      AvatarUrl,
      NgayTao
   FROM dbo.NguoiDung 
   WHERE TenDangNhap=@id OR Email=@id`,
  (rq, sql) => rq.input('id', sql.NVarChar(100), username),
)


  if (!rs.recordset.length) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const u = rs.recordset[0]

  const cand = crypto.pbkdf2Sync(
    password,
    u.PasswordSalt,
    ITERATIONS,
    HASH_LENGTH,
    DIGEST,
  )
  if (!crypto.timingSafeEqual(cand, u.MatKhauHash)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  if (u.TrangThai === false) {
    return res
      .status(403)
      .json({ error: 'Account is currently blocked or inactive.' })
  }

const accessToken = signAccess({
  uid: u.IDNguoiDung,
  role: u.VaiTro,
  name: u.TenDangNhap,
  // có thể bỏ avatarUrl/joinDate khỏi token, không bắt buộc
})

  const refresh = crypto.randomBytes(48).toString('base64url')
  const expiryDays = Number(process.env.REFRESH_EXPIRES_DAYS) || 30
  const exp = new Date()
  exp.setDate(exp.getDate() + expiryDays)

  await query(
    `INSERT INTO dbo.UserSession (IDNguoiDung, RefreshToken, IssuedAt, ExpiresAt)
     VALUES(@id, @rt, SYSUTCDATETIME(), @exp)`,
    (rq, sql) => {
      rq.input('id', sql.Int, u.IDNguoiDung)
      rq.input('rt', sql.NVarChar(200), refresh)
      rq.input('exp', sql.DateTime2, exp)
    },
  )

  const user = {
  id: u.IDNguoiDung,
  username: u.TenDangNhap,
  role: u.VaiTro,
  email: u.Email,        
  avatarUrl: u.AvatarUrl, 
  joinDate: u.NgayTao,   
}

  res.json({ accessToken, refreshToken: refresh, user })
})

// =====================================================
//  REFRESH TOKEN
// =====================================================
r.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' })
  }

  const rs = await query(
  `SELECT TOP 1 
      s.IDNguoiDung, 
      n.TenDangNhap, 
      n.VaiTro, 
      n.TrangThai,
      n.Email,
      n.AvatarUrl,
      n.NgayTao
   FROM dbo.UserSession s 
   JOIN dbo.NguoiDung n ON n.IDNguoiDung=s.IDNguoiDung
   WHERE s.RefreshToken=@rt AND s.ExpiresAt > SYSUTCDATETIME()`,
  (rq, sql) => rq.input('rt', sql.NVarChar(200), refreshToken),
)


  if (!rs.recordset.length) {
    return res
      .status(401)
      .json({ error: 'Invalid or expired refresh token' })
  }

  const u = rs.recordset[0]

  if (u.TrangThai === false) {
    await query(
      `DELETE FROM dbo.UserSession WHERE RefreshToken=@rt`,
      (rq, sql) => rq.input('rt', sql.NVarChar(200), refreshToken),
    )
    return res.status(403).json({ error: 'Associated account is inactive.' })
  }

  const accessToken = signAccess({
    uid: u.IDNguoiDung,
    role: u.VaiTro,
    name: u.TenDangNhap,
  })

  const user = { 
  id: u.IDNguoiDung, 
  username: u.TenDangNhap, 
  role: u.VaiTro,
  email: u.Email,
  avatarUrl: u.AvatarUrl,
  joinDate: u.NgayTao,
}


  res.json({ accessToken, user })
})

// =====================================================
//  LOGOUT
// =====================================================
r.post('/logout', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' })
  }

  try {
    await query(
      `DELETE FROM dbo.UserSession WHERE RefreshToken=@rt`,
      (rq, sql) => rq.input('rt', sql.NVarChar(200), refreshToken),
    )
    res.json({ ok: true, message: 'Logged out successfully.' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

export default r
