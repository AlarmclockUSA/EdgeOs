'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { doc, getDoc, Firestore } from 'firebase/firestore'
import { auth as firebaseAuth, db } from './firebase'
import { syncUserRoles, LMSRole } from './auth/role-mapping'
import { useRouter, usePathname } from 'next/navigation'

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
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<LMSRole | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    let unsubscribe: () => void = () => {}

    const initializeAuth = async () => {
      if (!firebaseAuth) {
        console.error('Firebase auth not initialized')
        setLoading(false)
        return
      }

      try {
        // Set persistence to LOCAL
        await setPersistence(firebaseAuth as Auth, browserLocalPersistence)
      } catch (error) {
        console.error('Error setting auth persistence:', error)
      }

      unsubscribe = onAuthStateChanged(firebaseAuth as Auth, async (user) => {
        console.log('Auth state changed:', { userId: user?.uid, pathname })
        setUser(user)
        
        // Updated auth pages check
        const isAuthPage = pathname === '/signin' || 
                          pathname === '/company-setup' ||
                          pathname === '/join/team' ||
                          pathname === '/join/supervisor' ||
                          pathname === '/forgot-password'

        if (!user) {
          setUserRole(null)
          setCompanyId(null)
          setCompanyName(null)
          setPermissions([])
          
          // Only redirect to signin if not already on an auth page
          if (!isAuthPage) {
            console.log('No user, redirecting to signin')
            router.push('/signin')
          }
        } else {
          try {
            const userDoc = await getDoc(doc(db as Firestore, 'users', user.uid))
            
            if (userDoc.exists()) {
              const userData = userDoc.data()
              const role = userData.role as LMSRole
              
              console.log('User data loaded:', { role, companyName: userData.companyName })
              
              setUserRole(role)
              setCompanyId(userData.companyId || null)
              setCompanyName(userData.companyName || null)

              // Sync display name if it doesn't match
              const displayName = `${userData.firstName} ${userData.lastName}`
              if (user.displayName !== displayName) {
                try {
                  await user.updateProfile({
                    displayName
                  })
                } catch (error) {
                  console.error('Error updating display name:', error)
                }
              }

              // Sync roles and get permissions
              const syncedRoles = await syncUserRoles(user, role, {
                companyId: userData.companyId,
                companyName: userData.companyName
              })

              setPermissions(syncedRoles.permissions)

              // If on an auth page and authenticated, redirect to home
              if (isAuthPage) {
                console.log('User authenticated, redirecting to home')
                router.push('/')
              }
            } else {
              console.error('No user document found for:', user.uid)
              if (!isAuthPage) {
                router.push('/signin')
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            if (!isAuthPage) {
              router.push('/signin')
            }
          }
        }
        
        setLoading(false)
      })
    }

    initializeAuth()

    return () => unsubscribe()
  }, [router, pathname])

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

