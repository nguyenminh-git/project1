import { useEffect, useState } from 'react'
import { listProducts } from '../services/products'
import { isFavorite, toggleFavorite } from '../services/favorites'
import { navigate } from '../router'

// URL tĩnh nơi backend phục vụ file static (ảnh, v.v.)
const STATIC_URL = (import.meta.env.VITE_STATIC_URL || 'http://localhost:3000').trim()
const PAGE_SIZE = 16

const CATEGORIES = [
  { label: 'Điện thoại – Laptop – Tablet', value: 'Điện thoại – Laptop – Tablet' },
  { label: 'Đồ điện tử – Gia dụng', value: 'Đồ điện tử – Gia dụng' },
  { label: 'Xe máy – Xe đạp', value: 'Xe máy – Xe đạp' },
  { label: 'Đồ nội thất – Trang trí', value: 'Đồ nội thất – Trang trí' },
  { label: 'Thời trang – Phụ kiện', value: 'Thời trang – Phụ kiện' },
  { label: 'Sách – Đồ học tập', value: 'Sách – Đồ học tập' },
]

// Map trạng thái từ backend -> label + css
function getStatusInfo(item) {
  const raw = item.status || item.trangThai || item.TrangThai
  if (!raw) return null

  const map = {
    ConHang:   { label: 'Còn hàng',   className: 'status-available' },
    DaBan:     { label: 'Đã bán',     className: 'status-sold' },
    DaTraoDoi: { label: 'Đã trao đổi', className: 'status-traded' },
    BiKhoa:    { label: 'Bị khoá',    className: 'status-locked' },
  }

  return map[raw] || { label: raw, className: 'status-other' }
}


/**
 * ProductCard
 * - Hiển thị thông tin sản phẩm (ảnh, tiêu đề, giá, meta)
 * - onFav: callback khi bấm nút yêu thích
 */
function ProductCard({ item, onFav }) {
  const imageUrl = item?.images?.[0]
    ? `${STATIC_URL}${item.images[0]}`
    : 'https://placehold.co/300x200/333/fff?text=No+Image'

  const handleClick = () => {
    navigate(`/posts/${item.id}`)
  }

  const handleToggleFav = (e) => {
    e.stopPropagation()
    onFav(item.id)
  }

  const statusInfo = getStatusInfo(item)

  return (
    <div className="card product">
      <div style={{ position: 'relative' }}>
        <img
          onClick={handleClick}
          src={imageUrl}
          alt={item.title || 'product'}
        />

        {/* Trạng thái góc trên bên trái */}
        {statusInfo && (
          <span
            className={`status-badge ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
        )}

        <button
          type="button"
          className={`heart-btn ${isFavorite(item.id) ? 'active' : ''}`}
          onClick={handleToggleFav}
          aria-label="Yêu thích"
        >
          ♥
        </button>
      </div>

      <div className="product-body">
        <h4>{item.title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="price">
            {item.price === 0
              ? 'Miễn phí'
              : item.price.toLocaleString('vi-VN') + 'đ'}
          </div>
          {item.price === 0 && <span className="badge free">Free</span>}
        </div>
        <div className="meta">
          {item.category} • {item.condition}
        </div>
      </div>
    </div>
  )
}


/**
 * HomePage
 * - Tải danh sách sản phẩm từ backend
 * - Lọc / sắp xếp / phân trang
 * - Lưu/áp dụng tìm kiếm từ localStorage (svm_search)
 */
export default function HomePage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('relevant')
  const [freeOnly, setFreeOnly] = useState(false)
  const [page, setPage] = useState(1)

  // Đọc search đã lưu từ localStorage
  useEffect(() => {
    const applySearchFromStorage = () => {
      try {
        const raw = localStorage.getItem('svm_search')
        if (!raw) return
        const s = JSON.parse(raw) || {}
        if (typeof s.q === 'string') setQ(s.q)
        if (typeof s.category === 'string') setCategory(s.category)
      } catch {
        // bỏ qua lỗi parse
      }
    }
    
    applySearchFromStorage()
    const handler = () => applySearchFromStorage()
    window.addEventListener('svm_search_change', handler)

    let mounted = true
    listProducts({})
      .then((res) => {
        if (!mounted) return
        setItems(res || [])
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
      window.removeEventListener('svm_search_change', handler)
    }
  }, [])

  // Reset về trang 1 khi thay đổi lọc / sắp xếp
  useEffect(() => {
    setPage(1)
  }, [q, category, sort, freeOnly])

  const qLower = (q || '').toLowerCase()

  // Lọc theo từ khóa, danh mục, và chỉ miễn phí
  const filtered = items.filter((it) => {
    const title = (it.title || '').toLowerCase()
    const matchesQ = title.includes(qLower)
    const matchesCategory = !category || it.category === category
    const matchesFree = !freeOnly || it.price === 0
    return matchesQ && matchesCategory && matchesFree
  })

  // Sắp xếp (mặc định = relevant)
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price-asc') return (a.price || 0) - (b.price || 0)
    if (sort === 'price-desc') return (b.price || 0) - (a.price || 0)
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  // Điều chỉnh page khi totalPages thay đổi để tránh page > total
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const paged = [
    {
        "id": 30,
        "title": "Mũ lưỡi trai",
        "price": 90000,
        "category": "Thời trang – Phụ kiện",
        "images": [
            "/uploads/30muluoitrai.jpg"
        ],
        "seller": "linht",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 18,
        "title": "Xe đạp trẻ em 20\"",
        "price": 900000,
        "category": "Xe máy – Xe đạp",
        "images": [
            "/uploads/18xedaptreem.jpg"
        ],
        "seller": "linht",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 34,
        "title": "Sổ tay chấm bi A5",
        "price": 30000,
        "category": "Sách – Đồ học tập",
        "images": [
            "/uploads/34sotaychambi.jpg"
        ],
        "seller": "thanhv",
        "location": "Nghệ An",
        "status": "ConHang"
    },
    {
        "id": 27,
        "title": "Túi đeo chéo da",
        "price": 260000,
        "category": "Thời trang – Phụ kiện",
        "images": [
            "/uploads/27tuideocheoda.jpg"
        ],
        "seller": "anhle",
        "location": "Hải Phòng",
        "status": "ConHang"
    },
    {
        "id": 31,
        "title": "Sách Flutter cơ bản",
        "price": 90000,
        "category": "Sách – Đồ học tập",
        "images": [
            "/uploads/31sachfluttercoban.jpg"
        ],
        "seller": "anhle",
        "location": "Hải Phòng",
        "status": "ConHang"
    },
    {
        "id": 11,
        "title": "Quạt điều hòa mini",
        "price": 610000,
        "category": "Đồ điện tử – Gia dụng",
        "images": [
            "/uploads/11quatdieuhoamini.jpg"
        ],
        "seller": "ngocd",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 24,
        "title": "Tranh treo tường canvas",
        "price": 450000,
        "category": "Đồ nội thất – Trang trí",
        "images": [
            "/uploads/24tranhtreotuongcanvas.jpg"
        ],
        "seller": "ngocd",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 25,
        "title": "Áo khoác gió nam size M",
        "price": 150000,
        "category": "Thời trang – Phụ kiện",
        "images": [
            "/uploads/25aokhoacgio.jpg"
        ],
        "seller": "minhng",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 33,
        "title": "Bộ bút highlight 6 màu",
        "price": 45000,
        "category": "Sách – Đồ học tập",
        "images": [
            "/uploads/33bobutchi6mau.jpg"
        ],
        "seller": "quangp",
        "location": "Bắc Ninh",
        "status": "ConHang"
    },
    {
        "id": 9,
        "title": "Loa Bluetooth chống nước",
        "price": 520000,
        "category": "Đồ điện tử – Gia dụng",
        "images": [
            "/uploads/9loabluetooth.jpg"
        ],
        "seller": "anhle",
        "location": "Hải Phòng",
        "status": "ConHang"
    },
    {
        "id": 32,
        "title": "Giáo trình Cấu trúc dữ liệu",
        "price": 75000,
        "category": "Sách – Đồ học tập",
        "images": [
            "/uploads/32sachcautrucdulieu.jpg"
        ],
        "seller": "huongn",
        "location": "Cần Thơ",
        "status": "ConHang"
    },
    {
        "id": 16,
        "title": "Xe đạp road Trinx",
        "price": 4100000,
        "category": "Xe máy – Xe đạp",
        "images": [
            "/uploads/16xedaproad.jpg"
        ],
        "seller": "thanhv",
        "location": "Nghệ An",
        "status": "ConHang"
    },
    {
        "id": 6,
        "title": "Xiaomi Redmi Note 12",
        "price": 4200000,
        "category": "Điện thoại – Laptop – Tablet",
        "images": [
            "/uploads/6xiaomi-redmi-note-12.jpg"
        ],
        "seller": "quangp",
        "location": "Bắc Ninh",
        "status": "ConHang"
    },
    {
        "id": 21,
        "title": "Kệ sách 4 tầng",
        "price": 520000,
        "category": "Đồ nội thất – Trang trí",
        "images": [
            "/uploads/21kesach4tang.jpg"
        ],
        "seller": "huongn",
        "location": "Cần Thơ",
        "status": "ConHang"
    },
    {
        "id": 26,
        "title": "Giày sneaker nữ 38",
        "price": 320000,
        "category": "Thời trang – Phụ kiện",
        "images": [
            "/uploads/26giaysneakernu.jpg"
        ],
        "seller": "trungd",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 5,
        "title": "iPad 9th 64GB Wi-Fi",
        "price": 6900000,
        "category": "Điện thoại – Laptop – Tablet",
        "images": [
            "/uploads/5ipad-9-sliver.jpg"
        ],
        "seller": "huongn",
        "location": "Cần Thơ",
        "status": "ConHang"
    },
    {
        "id": 20,
        "title": "Ghế văn phòng lưng cao",
        "price": 650000,
        "category": "Đồ nội thất – Trang trí",
        "images": [
            "/uploads/20ghevanphong.jpg"
        ],
        "seller": "anhle",
        "location": "Hải Phòng",
        "status": "ConHang"
    },
    {
        "id": 13,
        "title": "Xe đạp thể thao Giant",
        "price": 3500000,
        "category": "Xe máy – Xe đạp",
        "images": [
            "/uploads/13xedapthethaogiant.jpg"
        ],
        "seller": "minhng",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 36,
        "title": "Thước eke + compa",
        "price": 40000,
        "category": "Sách – Đồ học tập",
        "images": [
            "/uploads/36thuoceke.jpg"
        ],
        "seller": "linht",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 23,
        "title": "Tủ giày 3 tầng",
        "price": 700000,
        "category": "Đồ nội thất – Trang trí",
        "images": [
            "/uploads/23tugiay3tang.jpg"
        ],
        "seller": "thanhv",
        "location": "Nghệ An",
        "status": "ConHang"
    },
    {
        "id": 8,
        "title": "Máy hút bụi cầm tay",
        "price": 780000,
        "category": "Đồ điện tử – Gia dụng",
        "images": [
            "/uploads/8mayhutbuicamtay.jpg"
        ],
        "seller": "thanhv",
        "location": "Nghệ An",
        "status": "ConHang"
    },
    {
        "id": 3,
        "title": "Samsung Galaxy Tab S6",
        "price": 6500000,
        "category": "Điện thoại – Laptop – Tablet",
        "images": [
            "/uploads/3samsung-galaxy-tab-s6.jpg"
        ],
        "seller": "trungd",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 14,
        "title": "Xe đạp MTB Twitter",
        "price": 2900000,
        "category": "Xe máy – Xe đạp",
        "images": [
            "/uploads/14xedapmtbtwitter.jpg"
        ],
        "seller": "trungd",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 29,
        "title": "Kính mát unisex",
        "price": 180000,
        "category": "Thời trang – Phụ kiện",
        "images": [
            "/uploads/29kinhmatunisex.jpg"
        ],
        "seller": "ngocd",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 10,
        "title": "Bếp từ đơn Sunhouse",
        "price": 390000,
        "category": "Đồ điện tử – Gia dụng",
        "images": [
            "/uploads/10beptusungouse.jpg"
        ],
        "seller": "huongn",
        "location": "Cần Thơ",
        "status": "ConHang"
    },
    {
        "id": 19,
        "title": "Bàn làm việc gỗ sồi",
        "price": 1200000,
        "category": "Đồ nội thất – Trang trí",
        "images": [
            "/uploads/19banlamviecgosoi.jpg"
        ],
        "seller": "lanp",
        "location": "Đà Nẵng",
        "status": "ConHang"
    },
    {
        "id": 35,
        "title": "Máy tính Casio FX-580VN X",
        "price": 620000,
        "category": "Sách – Đồ học tập",
        "images": [
            "/uploads/35maytinhcasiofx580.jpg"
        ],
        "seller": "ngocd",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 2,
        "title": "Laptop ThinkPad T14",
        "price": 14500000,
        "category": "Điện thoại – Laptop – Tablet",
        "images": [
            "/uploads/2lenovo-thinkpad-t14-gen-3-thinkpro-02.jpg"
        ],
        "seller": "lanp",
        "location": "Đà Nẵng",
        "status": "ConHang"
    },
    {
        "id": 1,
        "title": "iPhone 12 64GB",
        "price": 8500000,
        "category": "Điện thoại – Laptop – Tablet",
        "images": [
            "/uploads/1iphone12.jpg"
        ],
        "seller": "minhng",
        "location": "Hà Nội",
        "status": "ConHang"
    },
    {
        "id": 28,
        "title": "Đồng hồ Casio F91W",
        "price": 290000,
        "category": "Thời trang – Phụ kiện",
        "images": [
            "/uploads/28donghocasiof91w.jpg"
        ],
        "seller": "huongn",
        "location": "Cần Thơ",
        "status": "ConHang"
    },
    {
        "id": 12,
        "title": "Nồi cơm điện 1.8L",
        "price": 450000,
        "category": "Đồ điện tử – Gia dụng",
        "images": [
            "/uploads/12noicomdien18l.jpg"
        ],
        "seller": "linht",
        "location": "TP.HCM",
        "status": "ConHang"
    },
    {
        "id": 7,
        "title": "Nồi chiên không dầu 3.5L",
        "price": 950000,
        "category": "Đồ điện tử – Gia dụng",
        "images": [
            "/uploads/7noichienklhongdau.jpg"
        ],
        "seller": "lanp",
        "location": "Đà Nẵng",
        "status": "DaBan"
    },
    {
        "id": 22,
        "title": "Đèn cây trang trí",
        "price": 300000,
        "category": "Đồ nội thất – Trang trí",
        "images": [
            "/uploads/22dencaytrangtri.jpg"
        ],
        "seller": "quangp",
        "location": "Bắc Ninh",
        "status": "ConHang"
    },
    {
        "id": 4,
        "title": "Laptop Acer Nitro 5",
        "price": 16500000,
        "category": "Điện thoại – Laptop – Tablet",
        "images": [
            "/uploads/4acer-nitro-v-15.jpg"
        ],
        "seller": "anhle",
        "location": "Hải Phòng",
        "status": "DaBan"
    },
    {
        "id": 15,
        "title": "Xe máy Wave RSX 2017",
        "price": 11500000,
        "category": "Xe máy – Xe đạp",
        "images": [
            "/uploads/15xemaywaversx.jpg"
        ],
        "seller": "quangp",
        "location": "Bắc Ninh",
        "status": "DaTraoDoi"
    },
    {
        "id": 17,
        "title": "Xe máy Vision 2019",
        "price": 25500000,
        "category": "Xe máy – Xe đạp",
        "images": [
            "/uploads/17xemayvison.jpg"
        ],
        "seller": "ngocd",
        "location": "Hà Nội",
        "status": "ConHang"
    }
]

  // Toggle favorite và ép component re-render bằng cách "refresh" state items
  const handleFav = (id) => {
    toggleFavorite(id)
    setItems((prev) => [...prev])
  }

  const changePage = (next) => {
    if (next < 1 || next > totalPages) return
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Tính các số trang hiển thị (tối đa 5 nút)
  const visiblePages = (() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5]
    }
    if (currentPage >= totalPages - 2) {
      return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  })()

  return (
    <div className="page">
      <div className="hero-section">
        <div className="hero-left">
          <span className="hero-pill">Sàn trao đổi đồ cũ · Sinh viên</span>
            <p>
              MABU là nơi bạn có thể mua bán lại sách, đồ điện tử, nội thất và hàng trăm món
              đồ cũ khác. Tái sử dụng để tiết kiệm và cùng nhau sống xanh hơn.
            </p>
            <div className="hero-actions">
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/posts/new')}
            >
            Đăng đồ cần nhượng
            </button>
            <button
              type="button"
              className="btn-light"
              onClick={() => navigate('/favorites')}
            >
            Xem đồ đang hot
        </button>
      </div>
    </div>

    <div className="hero-right">
      <div className="hero-image-stack">
        <img src="/images/turbo4pro.png" alt="Điện thoại" className="img-phone" />
        <img src="/images/precision3541.png" alt="Laptop" className="img-laptop" />
        <img src="/images/sachbodo.png" alt="Sách vở" className="img-books" />
      </div>
    </div>
  </div>


      <div className="home-cats">
        {CATEGORIES.map(({ label, value }) => {
          const active = category === value
          const toggle = () => setCategory(active ? '' : value)

          return (
            <div
              key={label}
              className={`home-cat-card ${active ? 'active' : ''}`}
              onClick={toggle}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggle()
              }}
            >
              {label}
            </div>
          )
        })}
      </div>

      {!loading && (
        <div className="toolbar-box" role="region" aria-label="Thanh công cụ">
          <div className="toolbar-left">
            <strong>{sorted.length}</strong> kết quả
          </div>
          <div className="toolbar-actions">
            <label className="field">
              <span>Sắp xếp</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevant">Mặc định</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
              </select>
            </label>
            <button
              className={`btn-toggle ${freeOnly ? 'active' : ''}`}
              onClick={() => setFreeOnly((v) => !v)}
            >
              Chỉ miễn phí
            </button>
            {category && (
              <button className="btn-ghost" onClick={() => setCategory('')}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="card product skeleton">
              <div className="media" />
              <div className="line" />
              <div className="line" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">Không có kết quả.</div>
      ) : (
        <>
          <div className="grid">
            {paged.map((it) => (
              <ProductCard key={it.id} item={it} onFav={handleFav} />
            ))}
          </div>

          {sorted.length > PAGE_SIZE && (
            <div
              className="pagination"
              role="navigation"
              aria-label="Phân trang sản phẩm"
            >
              <button
                className="page-btn"
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Trước
              </button>

              <div className="pagination-pages">
                {visiblePages[0] > 1 && (
                  <>
                    <button className="page-btn" onClick={() => changePage(1)}>
                      1
                    </button>
                    {visiblePages[0] > 2 && (
                      <span className="pagination-ellipsis">…</span>
                    )}
                  </>
                )}

                {visiblePages.map((num) => (
                  <button
                    key={num}
                    className={`page-btn ${
                      num === currentPage ? 'active' : ''
                    }`}
                    onClick={() => changePage(num)}
                  >
                    {num}
                  </button>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <>
                    {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                      <span className="pagination-ellipsis">…</span>
                    )}
                    <button
                      className="page-btn"
                      onClick={() => changePage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="page-btn"
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
