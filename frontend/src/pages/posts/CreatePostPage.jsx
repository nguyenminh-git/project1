import { useState, useRef } from 'react'
import { createProduct } from '../../services/products'
import { navigate } from '../../router'

export default function CreatePostPage() {
  // State chính cho form (khớp tên với backend)
  const [form, setForm] = useState({
    TieuDe: '',
    Gia: 0,
    IDDanhMuc: 1, // Mặc định 'Điện thoại – Laptop – Tablet'
    ViTri: 'Hà Nội',
    MoTa: '',
    images: [], // Mảng File object để gửi lên server
  })

  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imagePreviews, setImagePreviews] = useState([]) // URL để hiển thị preview

  const fileInputRef = useRef(null)

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('image/')
    )
    if (files.length === 0) return

    // Lưu File object (để gửi lên server)
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
    }))

    // Tạo URL preview để hiển thị
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const handleRemoveImage = (idx) => {
    // Xóa File object tương ứng
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }))

    // Xóa URL preview + revoke để tránh rò rỉ bộ nhớ
    setImagePreviews((prev) => {
      const urlToRevoke = prev[idx]
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.TieuDe.trim()) return
    setLoading(true)

    try {
      const created = await createProduct(form)
      // Dọn dẹp URL previews trước khi điều hướng
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
      navigate(`/posts/${created.IDBaiDang}`)
    } catch (err) {
      console.error(err)
      // TODO: có thể show toast / thông báo lỗi ở đây
    } finally {
      setLoading(false)
    }
  }

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handlePaste = (e) => {
    handleFiles(e.clipboardData.files)
  }

  return (
    <div className="page">
      <div className="compose">
        {/* Cột media */}
        <section className="panel card">
          <h3>Hình ảnh</h3>
          <div
            className={`dropzone ${dragOver ? 'over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p>Kéo & thả ảnh vào đây, hoặc</p>
            <button
              type="button"
              className="btn"
              onClick={handleOpenFileDialog}
            >
              Chọn ảnh
            </button>
            <p className="muted">
              Mẹo: dán (Ctrl+V) ảnh đã chụp màn hình
            </p>
          </div>

          {imagePreviews.length > 0 && (
            <div className="thumbs">
              {imagePreviews.map((src, idx) => (
                <div className="thumb" key={idx}>
                  <img src={src} alt={`Ảnh ${idx + 1}`} />
                  <button
                    type="button"
                    className="thumb-remove"
                    onClick={() => handleRemoveImage(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cột form */}
        <section className="panel card">
          <h2>Đăng bài</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label>Tiêu đề</label>
            <input
              className="input-lg"
              value={form.TieuDe}
              onChange={(e) => setField('TieuDe', e.target.value)}
              required
            />

            <label>Mô tả</label>
            <textarea
              rows={5}
              value={form.MoTa}
              onChange={(e) => setField('MoTa', e.target.value)}
            />

            <div className="row">
              <div>
                <label>Giá (0 = miễn phí)</label>
                <input
                  type="number"
                  min={0}
                  value={form.Gia}
                  onChange={(e) =>
                    setField('Gia', Number(e.target.value) || 0)
                  }
                />
              </div>

              <div>
                <label>Danh mục</label>
                <select
                  value={form.IDDanhMuc}
                  onChange={(e) =>
                    setField('IDDanhMuc', Number(e.target.value))
                  }
                >
                  <option value={1}>Điện thoại – Laptop – Tablet</option>
                  <option value={2}>Đồ điện tử – Gia dụng</option>
                  <option value={3}>Xe máy – Xe đạp</option>
                  <option value={4}>Đồ nội thất – Trang trí</option>
                  <option value={5}>Thời trang – Phụ kiện</option>
                  <option value={6}>Sách – Đồ học tập</option>
                </select>
              </div>

              <div>
                <label>Vị trí</label>
                <input
                  type="text"
                  value={form.ViTri}
                  onChange={(e) => setField('ViTri', e.target.value)}
                />
              </div>
            </div>

            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" disabled={loading}>
                {loading ? 'Đang đăng...' : 'Đăng bài'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
