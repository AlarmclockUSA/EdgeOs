'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User, Auth } from 'firebase/auth'
import { doc, getDoc, Firestore } from 'firebase/firestore'
import { auth as firebaseAuth, db } from './firebase'
import { syncUserRoles, LMSRole } from './auth/role-mapping'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  userRole: LMSRole | null
  companyId: string | null
  companyName: string | null
  permissions: string[]
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  companyId: null,
  companyName: null,
  permissions: []
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<LMSRole | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    if (!firebaseAuth) return

    const unsubscribe = onAuthStateChanged(firebaseAuth as Auth, async (user) => {
      setUser(user)
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db as Firestore, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const role = userData.role as LMSRole
            setUserRole(role)
            setCompanyId(userData.companyId || null)
            setCompanyName(userData.companyName || null)

            // If user has no company association, redirect to join company
            if (!userData.companyName) {
              router.push('/join-company')
              return
            }

            // Sync roles and get permissions
            const syncedRoles = await syncUserRoles(user, role, {
              companyId: userData.companyId,
              companyName: userData.companyName
            })

            setPermissions(syncedRoles.permissions)

            // Redirect to home if they have a company
            router.push('/')
          } else {
            // If user exists in Firebase Auth but not in Firestore, redirect to join company
            router.push('/join-company')
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          router.push('/join-company')
        }
      } else {
        setUserRole(null)
        setCompanyId(null)
        setCompanyName(null)
        setPermissions([])
        router.push('/signin')
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userRole, 
      companyId,
      companyName, 
      permissions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

