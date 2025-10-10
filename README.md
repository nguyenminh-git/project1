# Nhom_10_project
Web trao đổi – cho tặng đồ cũ miễn phí

# Hướng dẫn cài đặt và chạy dự án

## Yêu cầu môi trường
- Node.js >= 20.19.0 (khuyến nghị dùng Node 20.19.0 trở lên)
- npm (đi kèm Node.js)

## Các bước cài đặt

### 1. Clone dự án về máy
```sh
git clone <link-repo-của-bạn>
cd Nhom_10_project
```

### 2. Cài đặt dependencies
```sh
cd backend
npm install
cd ../frontend
npm install
```

### 3. Chạy dự án
Mở 2 terminal:

- **Terminal 1 (Backend):**
  ```sh
  cd backend
  node server.js
  ```
- **Terminal 2 (Frontend):**
  ```sh
  cd frontend
  npm run dev
  ```

### 4. Truy cập web
- Mở trình duyệt và vào địa chỉ: http://localhost:5173

## Lưu ý
- Nếu gặp lỗi về phiên bản Node, hãy nâng cấp Node.js lên bản mới hơn (>= 20.19.0).
- Backend mặc định chạy ở http://localhost:3000 (có thể thay đổi trong file backend/server.js).
- Frontend sẽ tự động gọi API tới backend qua các endpoint.

---
Nếu có vấn đề, hãy liên hệ nhóm trưởng hoặc người hướng dẫn để được hỗ trợ.
