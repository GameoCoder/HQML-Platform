import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchCaptcha, loginUser, getMe, verifyToken } from '../lib/api.js'

const AuthContext = createContext(null)

const TOKEN_KEY = 'schrodingers_cough_jwt_token'
const USER_KEY = 'schrodingers_cough_user_profile'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const meData = await getMe(storedToken)
        if (meData?.status === 'success' && meData?.user) {
          setUser(meData.user)
          localStorage.setItem(USER_KEY, JSON.stringify(meData.user))
        } else {
          // Token invalid
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setToken(null)
          setUser(null)
        }
      } catch (err) {
        // Fallback: keep cached user if network temporarily down
        console.warn('Auth verification skipped or failed:', err.message)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async ({ username, password, captcha_token, captcha_answer }) => {
    const res = await loginUser({ username, password, captcha_token, captcha_answer })
    if (res?.status === 'success' && res?.token && res?.user) {
      setToken(res.token)
      setUser(res.user)
      localStorage.setItem(TOKEN_KEY, res.token)
      localStorage.setItem(USER_KEY, JSON.stringify(res.user))
      return res.user
    }
    throw new Error(res?.message || 'Login failed')
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const isDoctor = user?.role === 'doctor'
  const isResearcher = user?.role === 'researcher'
  const isAdmin = user?.role === 'admin'
  const canDiagnoseImage = Boolean(user)
  const canDiagnoseData = Boolean(isResearcher || isAdmin)
  const canManageUsers = Boolean(isAdmin)

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    isDoctor,
    isResearcher,
    isAdmin,
    canDiagnoseImage,
    canDiagnoseData,
    canManageUsers,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
