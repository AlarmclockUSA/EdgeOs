'use client'

import dynamic from 'next/dynamic'
import { LoadingScreen } from '@/components/loading-screen'

const DynamicExecutiveDashboard = dynamic(
  () => import('../components/executive-dashboard'),
  { 
    loading: () => <LoadingScreen />,
    ssr: false 
  }
)

export default function ExecutiveClientPage() {
  return (
    <div className="pt-8">
      <DynamicExecutiveDashboard />
    </div>
  )
} 