import { Suspense } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { LoadingScreen } from '@/components/loading-screen'
import { SidebarProvider } from '@/components/ui/sidebar'
import dynamic from 'next/dynamic'
import './globals.css'
import './styles/shared.css'
import { LayoutContent } from './layout-content'

const ErrorBoundary = dynamic(() => import('@/components/error-boundary'), { ssr: false })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <ThemeProvider>
              <SidebarProvider>
                <Suspense fallback={<LoadingScreen />}>
                  <LayoutContent>{children}</LayoutContent>
                </Suspense>
              </SidebarProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}



import './globals.css'