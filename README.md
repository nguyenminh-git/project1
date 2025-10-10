# Nhom_10_project
Web trao đổi – cho tặng đồ cũ miễn phí

# Hướng dẫn cài đặt và chạy dự án

## Yêu cầu môi trường
- Node.js >= 20.19.0 (khuyến nghị dùng Node 20.19.0 trở lên)
- npm (đi kèm Node.js)

## Các bước cài đặt

Cài đặt
git clone https://github.com/Truongtruong3804/Nhom_10_project.git
cd Nhom_10_project

# Backend
cd backend
npm install

# Frontend (mở terminal khác hoặc quay lại thư mục gốc trước)
cd ../frontend
npm install

Chạy dự án (mở 2 terminal)

Terminal 1 – Backend

cd Nhom_10_project/backend
node server.js
# Backend chạy tại: http://localhost:5000
# Dừng server: Ctrl + C


Terminal 2 – Frontend

cd Nhom_10_project/frontend
npm run dev
# Mặc định: http://localhost:5173
# Nếu cổng 5173 bận, Vite sẽ hiện cổng khác (5174, 5175...), xem trong terminal.

### 4. Truy cập web
- Mở trình duyệt và vào địa chỉ: http://localhost:5173

## Lưu ý
- Nếu gặp lỗi về phiên bản Node, hãy nâng cấp Node.js lên bản mới hơn (>= 20.19.0).
- Backend mặc định chạy ở http://localhost:4000 (có thể thay đổi trong file backend/server.js).
- Frontend sẽ tự động gọi API tới backend qua các endpoint.

---
Nếu có vấn đề, hãy liên hệ nhóm trưởng hoặc người hướng dẫn để được hỗ trợ.
