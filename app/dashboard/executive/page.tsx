'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LoadingScreen } from '@/components/loading-screen'
import { useAuth } from '@/lib/auth-context'

const DynamicExecutiveDashboard = dynamic(
  () => import('@/components/executive-dashboard'),
  { 
    loading: () => <LoadingScreen />,
    ssr: false
  }
)

export default function ExecutiveDashboardPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || userRole !== 'executive')) {
      router.push('/signin')
    }
  }, [user, userRole, loading, router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user || userRole !== 'executive') {
    return null
  }

  return <DynamicExecutiveDashboard />
}

