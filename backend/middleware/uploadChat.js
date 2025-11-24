// middleware/uploadChat.js
import multer from 'multer'
import fs from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thư mục lưu ảnh chat: backend/uploads/chat
const uploadDir = path.join(__dirname, '../uploads/chat')

// Tạo thư mục nếu chưa có
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || ''
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_')
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${base}-${unique}${ext}`)
  },
})

function fileFilter(req, file, cb) {
  // chỉ cho ảnh
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false)
  }
  cb(null, true)
}

export const uploadChat = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})
