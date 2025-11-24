// File: backend/src/utils/jwt.js

import jwt from 'jsonwebtoken';

// 1. Lấy secret key từ .env
const ACCESS_SECRET = process.env.JWT_SECRET;

// 2. Lấy thời gian hết hạn (ví dụ: '15m' hoặc '1d')
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES_IN || '1h'; 

/**
 * Hàm tạo Access Token
 * (Sử dụng bởi routes/auth.js)
 */
export function signAccess(payload) {
    // Kiểm tra xem .env đã được load đúng chưa
    if (!ACCESS_SECRET) {
        console.error('Lỗi nghiêm trọng: JWT_SECRET không được định nghĩa trong file .env');
        // Không khởi động server nếu thiếu secret
        throw new Error('JWT_SECRET is not defined.'); 
    }

    // Tạo token bằng ĐÚNG secret key
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}