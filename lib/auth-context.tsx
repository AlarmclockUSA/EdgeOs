'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

interface AuthContextType {
  user: User | null
  userRole: string | null
  userPermissions: string[]
  companyName: string | null
  loading: boolean
  refreshUserSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  userPermissions: [],
  companyName: null,
  loading: true,
  refreshUserSession: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUserSession = async () => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true)
      const idTokenResult = await getIdTokenResult(auth.currentUser)
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserRole(userData.role)
        setUserPermissions(userData.permissions || [])
        setCompanyName(userData.companyName)
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        await refreshUserSession()
      } else {
        setUserRole(null)
        setUserPermissions([])
        setCompanyName(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, userRole, userPermissions, companyName, loading, refreshUserSession }}>
      {children}
    </AuthContext.Provider>
  )
}

