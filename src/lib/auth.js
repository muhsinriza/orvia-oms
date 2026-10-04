import { api } from './api'

export async function login(email, password) {
  return api.post('/auth/login', { email, password })
}

export async function logout() {
  return api.post('/auth/logout')
}

export async function getMe() {
  return api.get('/auth/me')
}
