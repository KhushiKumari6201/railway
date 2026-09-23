'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface UserSession {
  id: string
  name: string
  cadre: string
  designation: string
  department: string
  email: string
  division: string
  initials: string
  loginTime: string
  role?: string
  token?: string
  permissions?: string[]
}

export const defaultOfficers: UserSession[] = [
  {
    id: 'dom',
    name: 'S. K. Mukherjee',
    cadre: 'IRTS',
    designation: 'Sr. Divisional Operations Manager',
    department: 'Operating (Traffic Control)',
    email: 'srdom.kgp@ser.railnet.gov.in',
    division: 'Kharagpur Division, SER',
    initials: 'SM',
    loginTime: '',
    role: 'CONTROLLER',
  },
  {
    id: 'den',
    name: 'Rajesh Verma',
    cadre: 'IRSE',
    designation: 'Sr. Divisional Engineer / Planning',
    department: 'Civil Engineering (TMS Track)',
    email: 'srden.plan.kgp@ser.railnet.gov.in',
    division: 'Kharagpur Division, SER',
    initials: 'RV',
    loginTime: '',
    role: 'PLANNER',
  },
  {
    id: 'dee',
    name: 'Amit Sen',
    cadre: 'IRSEE',
    designation: 'Sr. Divisional Electrical Engineer',
    department: 'Traction Distribution (TDMS OHE)',
    email: 'srdee.trd.kgp@ser.railnet.gov.in',
    division: 'Kharagpur Division, SER',
    initials: 'AS',
    loginTime: '',
    role: 'PLANNER',
  },
  {
    id: 'dste',
    name: 'Priya Nair',
    cadre: 'IRSSE',
    designation: 'Sr. Divisional Signal & Telecom Engg',
    department: 'Signalling & Telecom (SMMS)',
    email: 'srdste.kgp@ser.railnet.gov.in',
    division: 'Kharagpur Division, SER',
    initials: 'PN',
    loginTime: '',
    role: 'MAINTENANCE_OFFICER',
  },
]

interface AuthContextType {
  user: UserSession | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (userData: Partial<UserSession>, redirectTo?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'railonic_user_session_v1'
const TOKEN_KEY = 'railsanket_auth_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()

  useEffect(() => {
    // Check localStorage on client mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UserSession
        setUser(parsed)
      } else {
        const defaultSession: UserSession = {
          ...defaultOfficers[0],
          loginTime: new Date().toLocaleTimeString('en-IN', { hour12: false }),
        }
        setUser(defaultSession)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSession))
      }
    } catch (e) {
      console.error('Failed to load user session from localStorage', e)
      setUser(defaultOfficers[0])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (userData: Partial<UserSession>, redirectTo = '/command-center') => {
    let authToken = userData.token || ''
    let userPermissions = userData.permissions || []

    // Try backend authentication if online
    if (userData.email) {
      try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            password: 'ser•planner•2026',
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.token) {
            authToken = data.token
            userPermissions = data.permissions || []
          }
        }
      } catch (err) {
        // Fallback gracefully to offline session
      }
    }

    const sessionUser: UserSession = {
      id: userData.id || 'usr-custom',
      name: userData.name || 'Officer On-Duty',
      cadre: userData.cadre || 'IRTS',
      designation: userData.designation || 'Divisional Traffic Controller',
      department: userData.department || 'Operating Control',
      email: userData.email || 'officer.kgp@ser.railnet.gov.in',
      division: userData.division || 'Kharagpur Division, SER',
      role: userData.role || 'CONTROLLER',
      token: authToken,
      permissions: userPermissions,
      initials:
        userData.initials ||
        (userData.name
          ? userData.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : 'IR'),
      loginTime: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser))
      if (authToken) {
        localStorage.setItem(TOKEN_KEY, authToken)
      }
      // Also set document cookie so server/middleware can read it if needed
      document.cookie = `railonic_auth=1; path=/; max-age=86400; SameSite=Lax`
    } catch (e) {
      console.error('Failed to save user session', e)
    }

    setUser(sessionUser)
    toast.success('Login successful')
    router.replace(redirectTo)
  }

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(TOKEN_KEY)
      document.cookie = `railonic_auth=; path=/; max-age=0`
    } catch (e) {
      console.error('Failed to clear user session', e)
    }
    setUser(null)
    toast.info('Signed out successfully')
    router.replace('/auth')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
