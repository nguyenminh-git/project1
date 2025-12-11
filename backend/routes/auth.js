import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../src/db.js';
import { signAccess } from '../src/utils/jwt.js';
import { uploadAvatar } from '../middleware/uploadAvatar.js';
import { sendVerificationEmail } from '../src/utils/mailer.js';

const r = Router();

// Định nghĩa độ dài salt và hash theo schema
const HASH_LENGTH = 64;
const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

// =====================================================
//  ĐĂNG KÝ (upload avatar + gửi mã xác thực email)
// =====================================================
r.post('/register', uploadAvatar, async (req, res) => {
  try {
    const { username, password, email } = req.body || {};

    // ===== VALIDATE THỦ CÔNG =====
    if (!username || typeof username !== 'string' || username.trim().length < 4) {
      return res.status(400).json({
        errors: [{ path: 'username', msg: 'Username phải có ít nhất 4 ký tự' }],
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        errors: [{ path: 'password', msg: 'Password phải có ít nhất 6 ký tự' }],
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({
        errors: [{ path: 'email', msg: 'Email không hợp lệ' }],
      });
    }

    const cleanUsername = username.trim();

    // ===== CHECK TRÙNG USERNAME / EMAIL =====
    const checkRs = await query(
      `
      SELECT 1 
      FROM "NguoiDung" 
      WHERE "TenDangNhap" = $1 OR "Email" = $2
      `,
      [cleanUsername, email]
    );

    if (checkRs.rows.length > 0) {
      return res.status(409).json({ error: 'Username or Email already exists.' });
    }

    // ===== HASH PASSWORD =====
    const salt = crypto.randomBytes(SALT_LENGTH);
    const passHash = crypto.pbkdf2Sync(
      password,
      salt,
      ITERATIONS,
      HASH_LENGTH,
      DIGEST
    );

    // ===== HANDLE AVATAR =====
    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;

    // ===== INSERT USER + LẤY ID VỪA TẠO =====
    const insertRs = await query(
      `
      INSERT INTO "NguoiDung"
        ("TenDangNhap","MatKhauHash","PasswordSalt","Email","VaiTro","TrangThai","AvatarUrl")
      VALUES
        ($1, $2, $3, $4, 'user', TRUE, $5)
      RETURNING "IDNguoiDung"
      `,
      [cleanUsername, passHash, salt, email, avatarPath]
    );

    const newUserId = insertRs.rows?.[0]?.IDNguoiDung;

    if (!newUserId) {
      console.warn('Không lấy được IDNguoiDung sau khi INSERT');
      return res.status(201).json({
        ok: true,
        message:
          'Registration successful, but email verification may not be available.',
      });
    }

    // ===== TẠO MÃ XÁC THỰC EMAIL =====
    const verifyCode = Math.floor(100000 + Math.random() * 900000)
      .toString()
      .padStart(6, '0');

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 phút

    await query(
      `
      UPDATE "NguoiDung"
      SET 
        "EmailVerified" = FALSE,
        "EmailVerifyCode" = $1,
        "EmailVerifyExpiresAt" = $2
      WHERE "IDNguoiDung" = $3
      `,
      [verifyCode, expires, newUserId]
    );

    // ===== GỬI EMAIL CHỨA MÃ XÁC THỰC =====
    try {
      await sendVerificationEmail(email, verifyCode);
    } catch (mailErr) {
      console.error('Send verification email error:', mailErr);
    }

    return res.status(201).json({
      ok: true,
      message:
        'Registration successful. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: 'Internal server error while registering.',
    });
  }
});

// =====================================================
//  ĐĂNG NHẬP
// =====================================================
r.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username và password là bắt buộc.' });
  }

  const rs = await query(
    `
    SELECT 
      "IDNguoiDung",
      "TenDangNhap",
      "MatKhauHash",
      "PasswordSalt",
      "VaiTro",
      "TrangThai",
      "Email",
      "AvatarUrl",
      "NgayTao",
      "EmailVerified"
    FROM "NguoiDung"
    WHERE "TenDangNhap" = $1 OR "Email" = $1
    LIMIT 1
    `,
    [username]
  );

  if (!rs.rows.length) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const u = rs.rows[0];

  const cand = crypto.pbkdf2Sync(
    password,
    u.PasswordSalt,
    ITERATIONS,
    HASH_LENGTH,
    DIGEST
  );

  if (!crypto.timingSafeEqual(cand, u.MatKhauHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (u.TrangThai === false) {
    return res
      .status(403)
      .json({ error: 'Account is currently blocked or inactive.' });
  }

  if (!u.EmailVerified) {
    return res.status(403).json({
      error:
        'Email chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  const accessToken = signAccess({
    uid: u.IDNguoiDung,
    role: u.VaiTro,
    name: u.TenDangNhap,
  });

  const refresh = crypto.randomBytes(48).toString('base64url');
  const expiryDays = Number(process.env.REFRESH_EXPIRES_DAYS) || 30;
  const exp = new Date();
  exp.setDate(exp.getDate() + expiryDays);

  await query(
    `
    INSERT INTO "UserSession"
      ("IDNguoiDung","RefreshToken","IssuedAt","ExpiresAt")
    VALUES ($1, $2, NOW(), $3)
    `,
    [u.IDNguoiDung, refresh, exp]
  );

  const user = {
    id: u.IDNguoiDung,
    username: u.TenDangNhap,
    role: u.VaiTro,
    email: u.Email,
    avatarUrl: u.AvatarUrl,
    joinDate: u.NgayTao,
  };

  res.json({ accessToken, refreshToken: refresh, user });
});

// =====================================================
//  REFRESH TOKEN
// =====================================================
r.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  const rs = await query(
    `
    SELECT 
      s."IDNguoiDung",
      n."TenDangNhap",
      n."VaiTro",
      n."TrangThai",
      n."Email",
      n."AvatarUrl",
      n."NgayTao",
      n."EmailVerified"
    FROM "UserSession" s
    JOIN "NguoiDung" n ON n."IDNguoiDung" = s."IDNguoiDung"
    WHERE s."RefreshToken" = $1
      AND s."ExpiresAt" > NOW()
    LIMIT 1
    `,
    [refreshToken]
  );

  if (!rs.rows.length) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const u = rs.rows[0];

  if (u.TrangThai === false) {
    await query(
      `DELETE FROM "UserSession" WHERE "RefreshToken" = $1`,
      [refreshToken]
    );
    return res.status(403).json({ error: 'Associated account is inactive.' });
  }

  if (!u.EmailVerified) {
    return res.status(403).json({
      error: 'Email chưa được xác thực.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  const accessToken = signAccess({
    uid: u.IDNguoiDung,
    role: u.VaiTro,
    name: u.TenDangNhap,
  });

  const user = {
    id: u.IDNguoiDung,
    username: u.TenDangNhap,
    role: u.VaiTro,
    email: u.Email,
    avatarUrl: u.AvatarUrl,
    joinDate: u.NgayTao,
  };

  res.json({ accessToken, user });
});

// =====================================================
//  VERIFY EMAIL
// =====================================================
r.post('/verify-email', async (req, res) => {
  const { email, code } = req.body || {};

  if (!email || !code) {
    return res
      .status(400)
      .json({ error: 'Email và mã xác thực là bắt buộc.' });
  }

  const rs = await query(
    `
    SELECT 
      "IDNguoiDung",
      "EmailVerified",
      "EmailVerifyCode",
      "EmailVerifyExpiresAt"
    FROM "NguoiDung"
    WHERE "Email" = $1
    LIMIT 1
    `,
    [email]
  );

  if (!rs.rows.length) {
    return res
      .status(404)
      .json({ error: 'Không tìm thấy tài khoản với email này.' });
  }

  const u = rs.rows[0];

  if (u.EmailVerified) {
    return res
      .status(400)
      .json({ error: 'Email đã được xác thực trước đó.' });
  }

  const now = new Date();

  if (!u.EmailVerifyCode || u.EmailVerifyCode !== code) {
    return res.status(400).json({ error: 'Mã xác thực không đúng.' });
  }

  if (!u.EmailVerifyExpiresAt || now > u.EmailVerifyExpiresAt) {
    return res.status(400).json({ error: 'Mã xác thực đã hết hạn.' });
  }

  await query(
    `
    UPDATE "NguoiDung"
    SET 
      "EmailVerified" = TRUE,
      "EmailVerifyCode" = NULL,
      "EmailVerifyExpiresAt" = NULL
    WHERE "IDNguoiDung" = $1
    `,
    [u.IDNguoiDung]
  );

  return res.json({
    ok: true,
    message: 'Xác thực email thành công. Bạn có thể đăng nhập.',
  });
});

// =====================================================
//  RESEND VERIFY CODE
// =====================================================
r.post('/resend-verify-code', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email là bắt buộc.' });
  }

  const rs = await query(
    `
    SELECT 
      "IDNguoiDung",
      "EmailVerified"
    FROM "NguoiDung"
    WHERE "Email" = $1
    LIMIT 1
    `,
    [email]
  );

  if (!rs.rows.length) {
    return res
      .status(404)
      .json({ error: 'Không tìm thấy tài khoản với email này.' });
  }

  const u = rs.rows[0];

  if (u.EmailVerified) {
    return res.status(400).json({ error: 'Email đã được xác thực.' });
  }

  const verifyCode = Math.floor(100000 + Math.random() * 900000)
    .toString()
    .padStart(6, '0');

  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 15);

  await query(
    `
    UPDATE "NguoiDung"
    SET 
      "EmailVerifyCode" = $1,
      "EmailVerifyExpiresAt" = $2
    WHERE "IDNguoiDung" = $3
    `,
    [verifyCode, expires, u.IDNguoiDung]
  );

  try {
    await sendVerificationEmail(email, verifyCode);
  } catch (err) {
    console.error('Resend mail error:', err);
  }

  res.json({ ok: true, message: 'Đã gửi lại mã xác thực.' });
});

// =====================================================
//  LOGOUT
// =====================================================
r.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    await query(
      `DELETE FROM "UserSession" WHERE "RefreshToken" = $1`,
      [refreshToken]
    );
    res.json({ ok: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default r;
