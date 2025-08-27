"use client"

import { useState, useEffect, useContext, createContext, ReactNode } from "react"
import { User, AuthState } from "@/types"
import {
  validateSession,
  logout as performLogout,
  AuthError,
  getStoredToken,
  removeStoredToken
} from "@/lib/auth"

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const validatedUser = await validateSession()
      if (validatedUser) {
        setUser(validatedUser)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setUser(null)
      setIsAuthenticated(false)
      // Clear any invalid tokens
      removeStoredToken()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new AuthError(errorData.error || 'Login failed')
      }

      const { user: authenticatedUser, token } = await response.json()

      // Store token in localStorage
      localStorage.setItem('auth_token', token)

      setUser(authenticatedUser)
      setIsAuthenticated(true)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string): Promise<void> => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new AuthError(errorData.error || 'Registration failed')
      }

      const { user: authenticatedUser, token } = await response.json()

      // Store token in localStorage
      localStorage.setItem('auth_token', token)

      setUser(authenticatedUser)
      setIsAuthenticated(true)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    setIsLoading(true)

    try {
      await performLogout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const token = getStoredToken()
      if (!token) {
        throw new AuthError('No authentication token found')
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new AuthError('Failed to fetch user data')
      }

      const { user: updatedUser } = await response.json()
      setUser(updatedUser)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // If refresh fails, logout the user
      await logout()
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for protecting routes
export function useRequireAuth(): AuthContextType {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login page
      window.location.href = '/login'
    }
  }, [auth.isLoading, auth.isAuthenticated])

  return auth
}

// Hook for guest-only routes (login, register)
export function useGuestOnly(): AuthContextType {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      // Redirect to dashboard
      window.location.href = '/dashboard'
    }
  }, [auth.isLoading, auth.isAuthenticated])

  return auth
}
