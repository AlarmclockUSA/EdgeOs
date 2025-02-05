'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { LoadingScreen } from '@/components/loading-screen'
import { SidebarProvider } from '@/components/ui/sidebar'
import dynamic from 'next/dynamic'
import './globals.css'
import './styles/shared.css'
import { LayoutContent } from './layout-content'
import { Menu, LogOut, BookOpen, Library, Target, Settings, Users, LayoutDashboard, Building, Cog } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toaster } from '@/components/ui/toaster'
import { OnboardingModal } from '@/components/onboarding-modal'
import { useOnboarding } from '@/lib/hooks/use-onboarding'

const ErrorBoundary = dynamic(() => import('@/components/error-boundary'), { ssr: false })

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { showOnboarding, setShowOnboarding, loading } = useOnboarding()

  if (loading) return null

  return (
    <>
      {children}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      <Toaster />
    </>
  )
}

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
                  <div className="md:hidden absolute top-4 right-4 z-50">
                    <MobileMenu />
                  </div>
                  <RootLayoutContent>
                    <LayoutContent>{children}</LayoutContent>
                  </RootLayoutContent>
                </Suspense>
              </SidebarProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

function MobileMenu() {
  const { user, userRole, companyName } = useAuth()

  if (!user || !userRole) return null

  const navigationItems = {
    team_member: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'Account Settings', href: '/account', icon: Settings }
    ],
    supervisor: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'My Team', href: '/supervisor', icon: Users },
      ...(companyName === 'Brilliant Perspectives' ? [{ name: 'Admin', href: '/admin', icon: LayoutDashboard }] : []),
      { name: 'Account Settings', href: '/account', icon: Settings }
    ],
    executive: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'My Team', href: '/supervisor', icon: Users },
      { name: 'Executive Dashboard', href: '/executive', icon: Building },
      ...(companyName === 'Brilliant Perspectives' ? [{ name: 'Admin', href: '/admin', icon: LayoutDashboard }] : []),
      { name: 'Company Settings', href: '/company-settings', icon: Cog },
      { name: 'Account Settings', href: '/account', icon: Settings }
    ]
  }

  const navigation = navigationItems[userRole as keyof typeof navigationItems] || []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {navigation.map((item) => (
          <DropdownMenuItem key={item.name} asChild>
            <Link href={item.href} className="flex items-center gap-2 w-full">
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import './globals.css'