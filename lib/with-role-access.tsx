'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

export function withRoleAccess(WrappedComponent: React.ComponentType, allowedRoles: string[]) {
  return function WithRoleAccess(props: any) {
    const { user, userRole, loading } = useAuth()
    const router = useRouter()

    if (typeof window !== 'undefined' && !loading) {
      if (!user || !allowedRoles.includes(userRole)) {
        router.push('/')
        return null
      }
    }

    if (loading) {
      return <div>Loading...</div>
    }

    return <WrappedComponent {...props} />
  }
}

