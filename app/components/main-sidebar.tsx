'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Users, Building, LogOut, Settings, Cog, LayoutDashboard, Library, Target } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'

export function MainSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userRole, loading, companyName } = useAuth()
  const { isOpen, setOpen } = useSidebar()

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      router.push('/signin')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading || !user || !userRole) {
    return null
  }

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
      { name: 'Account Settings', href: '/account', icon: Settings }
    ],
    executive: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'My Team', href: '/supervisor', icon: Users },
      { name: 'Executive Dashboard', href: '/executive', icon: Building },
      { name: 'Company Settings', href: '/company-settings', icon: Cog },
      { name: 'Account Settings', href: '/account', icon: Settings }
    ]
  }

  const navigation = navigationItems[userRole as keyof typeof navigationItems] || []

  return (
    <Sidebar className="bg-card text-card-foreground border-r">
      <SidebarHeader className="p-6 border-b">
        <Link href="/" className="flex items-center justify-center w-full">
          <Image
            src="https://rzdccuvdljw6vbd9.public.blob.vercel-storage.com/Brilliant%20OS-ofsf9nuYIrEGT5LskvEXB43sZ04EdI.png"
            alt="Brilliant OS Logo"
            width={200}
            height={50}
            className="w-full h-auto"
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-6">
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="hover:bg-muted hover:text-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground px-6 py-3 rounded-md w-full flex items-center gap-3 mb-2"
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="w-5 h-5" />
                  <span className="text-lg">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="hover:bg-destructive hover:text-destructive-foreground mt-auto text-muted-foreground transition-colors px-6 py-3 rounded-md w-full flex items-center gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}

