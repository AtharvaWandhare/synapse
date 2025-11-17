import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export default api
