import jwt from 'jsonwebtoken';

/**
 * Middleware: Xác thực JWT (Authorization).
 * Gắn req.user = {uid, role, name} nếu token hợp lệ.
 */
export function auth(req, res, next) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    
    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }
    
    try {
        // Xác thực token và gán payload vào req.user
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        let errorMsg = 'Invalid token';
        
        // Kiểm tra nếu lỗi là do token hết hạn
        if (err.name === 'TokenExpiredError') { 
            errorMsg = 'Token has expired';
            return res.status(401).json({ error: errorMsg, code: 'TOKEN_EXPIRED' });
        }
        
        // Các lỗi khác (token sai, chữ ký không khớp)
        return res.status(401).json({ error: errorMsg });
    }
}

/**
 * Middleware: Phân quyền Admin. 
 * PHẢI chạy sau middleware auth (protect).
 */
export function isAdmin(req, res, next) {
    // req.user được gắn bởi hàm auth()
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // 403 Forbidden: Đã xác thực nhưng không có quyền
        res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
}