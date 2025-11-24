// src/services/users.js
import { api } from './apiClient'

export async function getPublicUser(id) {
  return api.get(`/api/users/${id}`)
}
