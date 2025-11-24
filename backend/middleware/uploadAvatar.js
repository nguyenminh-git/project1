import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + ext)
  },
})

export const uploadAvatar = multer({ storage }).single('avatar')
