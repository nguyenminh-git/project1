// src/services/reviews.js
import { api } from './apiClient'

// BÌNH LUẬN THEO BÀI ĐĂNG
export async function listComments(postId) {
  return api.get(`/api/posts/${postId}/comments`)
}

export async function addComment(postId, content) {
  return api.post(`/api/posts/${postId}/comments`, { noiDung: content })
}

// ĐÁNH GIÁ NGƯỜI BÁN / NGƯỜI MUA
export async function getUserRating(userId) {
  return api.get(`/api/users/${userId}/rating`)
}

export async function rateUser(userId, score, comment = '') {
  return api.post(`/api/users/${userId}/rating`, {
    diem: score,
    nhanXet: comment,
  })
}
