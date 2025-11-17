import React, { createContext, useContext, useEffect, useState } from 'react'
import api, { setAuthToken } from '@/lib/api'

type UserType = 'jobseeker' | 'company' | null

type AuthContextType = {
  token: string | null
  userType: UserType
  userId: number | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('jwt')
    } catch {
      return null
    }
  })

  const [userType, setUserType] = useState<UserType>(() => {
    try {
      const stored = localStorage.getItem('user_type')
      return (stored as UserType) || null
    } catch {
      return null
    }
  })

  const [userId, setUserId] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('user_id')
      return stored ? parseInt(stored, 10) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    setAuthToken(token)
    if (token) {
      localStorage.setItem('jwt', token)
    } else {
      localStorage.removeItem('jwt')
      localStorage.removeItem('user_type')
      localStorage.removeItem('user_id')
    }
  }, [token])

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/jwt-login', { email, password })
      if (res.status === 200 && res.data?.token) {
        setToken(res.data.token)
        setUserType(res.data.user_type as UserType)
        setUserId(res.data.user_id)
        localStorage.setItem('user_type', res.data.user_type)
        localStorage.setItem('user_id', res.data.user_id.toString())
        return true
      }
      return false
    } catch (e) {
      console.error('login error', e)
      return false
    }
  }

  const logout = () => {
    setToken(null)
    setUserType(null)
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ token, userType, userId, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
