import { USE_MOCKS, api } from './apiClient'
import { mockProducts } from '../mocks/data'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export async function listProducts() {
  if (USE_MOCKS) {
    await delay(300)
    return mockProducts
  }
  return api.get('/api/posts')
}

export async function getProductById(id) {
  if (USE_MOCKS) {
    await delay(150)
    return mockProducts.find((p) => p.id === id)
  }
  return api.get(`/api/posts/${id}`)
}

export async function createProduct(payload) {
  if (USE_MOCKS) {
    await delay(400)
    const created = {
      ...payload,
      id: 'p' + Math.random().toString(36).slice(2),
      images: payload.images?.filter(Boolean) || [],
    }
    mockProducts.unshift(created)
    return created
  }

  // Dùng FormData để upload nhiều file ảnh
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'images') {
      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file instanceof File) {
            formData.append('images', file)
          }
        })
      }
      return
    }

    if (value !== null && value !== undefined) {
      formData.append(key, value)
    }
  })

  const res = await api.postWithFiles('/api/posts', formData)

  // ✅ Chuẩn hóa lại cho frontend: luôn có thuộc tính IDBaiDang & id
  const id =
    res?.IDBaiDang ??
    res?.id ??
    res?.postId ??
    res?.ID

  return {
    ...res,
    IDBaiDang: id,
    id,
  }
}

