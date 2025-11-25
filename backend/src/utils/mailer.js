// src/utils/mailer.js
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // nếu dùng 465 thì mới true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export function sendVerificationEmail(to, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  const subject = 'Mã xác thực email MABU'
  const text = `Mã xác thực MABU của bạn là: ${code}. Mã có hiệu lực trong 15 phút.`
  const html = `
    <p>Chào bạn,</p>
    <p>Mã xác thực MABU của bạn là: <b>${code}</b>.</p>
    <p>Mã có hiệu lực trong 15 phút.</p>
  `

  return transporter.sendMail({ from, to, subject, text, html })
}
