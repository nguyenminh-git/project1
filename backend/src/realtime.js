// src/realtime.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;

export function initRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // hoặc origin FE của bạn
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  // Middleware auth cho socket (dùng cùng JWT_SECRET với REST)
  io.use((socket, next) => {
    try {
      // Lấy token từ auth (client gửi lên)
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace('Bearer ', '');

      if (!token) {
        return next(new Error('Missing token'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { uid: payload.uid, role: payload.role, name: payload.name };
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.uid;
    console.log('Socket connected:', userId);

    // Mỗi user join 1 "room" riêng theo ID
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', userId);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io is not initialized');
  }
  return ioInstance;
}
