'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { LoadingScreen } from '@/components/loading-screen'

export default function Dashboard() {
  const { user, userRole, loading, refreshUserSession } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!loading) {
        if (!user) {
          router.push('/signin')
          return
        }

        // Refresh the user session to ensure we have the latest role information
        await refreshUserSession()
        
        // Now route based on role
        switch (userRole) {
          case 'executive':
            router.push('/dashboard/executive')
            break
          case 'supervisor':
            router.push('/dashboard/supervisor')
            break
          case 'team_member':
            router.push('/')
            break
          default:
            router.push('/signin')
        }
      }
    }

    initializeDashboard()
  }, [user, userRole, loading, router, refreshUserSession])

  return <LoadingScreen />
}

