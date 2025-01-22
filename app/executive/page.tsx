import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { LoadingScreen } from '@/components/loading-screen'

const DynamicExecutiveDashboard = dynamic(
  () => import('../components/executive-dashboard'),
  { ssr: false }
)

export default function ExecutivePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DynamicExecutiveDashboard />
    </Suspense>
  )
}

