// services/posts.js
import { api } from './apiClient'

export async function getPostById(id) {
  return api.get(`/api/posts/${id}`)
}

export async function markPostSold(postId, buyerId) {
  return api.post(`/api/posts/${postId}/mark-sold`, { buyerId })
}
