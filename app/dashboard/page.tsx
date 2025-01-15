'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { LoadingScreen } from '@/components/loading-screen'

export default function Dashboard() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/signin')
        return
      }
      
      // Route based on role
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
  }, [user, userRole, loading, router])

  return <LoadingScreen />
}

