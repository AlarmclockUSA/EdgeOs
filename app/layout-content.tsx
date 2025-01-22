'use client'

import { useAuth } from '@/lib/auth-context'
import { MainSidebar } from './components/main-sidebar'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {user && <MainSidebar />}
      <div className="flex-grow min-w-0 min-h-screen overflow-x-hidden bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: "url('https://rzdccuvdljw6vbd9.public.blob.vercel-storage.com/Brilliant%20Gradient%20Pack-08-o0UBIWfn04dBV1myh1cHrj8dV5SWSN.jpeg')"
      }}>
        <div className="container mx-auto py-6 px-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}

