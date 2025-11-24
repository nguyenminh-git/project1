import { useEffect, useState } from 'react'
import { getFavorites } from '../services/favorites'
import { listProducts } from '../services/products'
import { navigate } from '../router'

// URL tĩnh nơi backend phục vụ file static (ảnh)
const STATIC_URL = import.meta.env.VITE_STATIC_URL || 'http://localhost:3000'
const PLACEHOLDER = 'https://placehold.co/300x200/333/fff?text=No+Image'

export default function FavoritesPage() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let mounted = true

    Promise.all([listProducts({}), getFavorites()])
      .then(([all = [], ids = []]) => {
        if (!mounted) return
        // ids có thể là [] hoặc undefined, đảm bảo là array
        const favorites = Array.isArray(ids) ? ids : []
        setItems(all.filter((p) => favorites.includes(p.id)))
      })
      .catch(() => {
        if (!mounted) return
        setItems([])
      })

    return () => { mounted = false }
  }, [])

  return (
    <div className="page">
      <h2>Sản phẩm yêu thích</h2>

      {items.length === 0 ? (
        <div className="empty">Chưa có sản phẩm yêu thích.</div>
      ) : (
        <div className="grid">
          {items.map((it) => {
            const src = it.images?.[0] ? `${STATIC_URL}${it.images[0]}` : PLACEHOLDER
            return (
              <div
                key={it.id}
                className="card product"
                onClick={() => navigate(`/posts/${it.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/posts/${it.id}`) }}
              >
                {/*
                  - Sử dụng imageUrl đầy đủ (STATIC_URL + path từ backend)
                  - onError: nếu ảnh không tải được sẽ dùng placeholder
                */}
                <img
                  src={src}
                  alt={it.title || 'product'}
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
                />

                <div className="product-body">
                  <h4>{it.title}</h4>
                  <div className="price">{it.price === 0 ? 'Miễn phí' : (it.price || 0).toLocaleString('vi-VN') + 'đ'}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
