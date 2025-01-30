import { User } from 'firebase/auth'
import { getUser } from '@/lib/tribe-api'

export type LMSRole = 'executive' | 'supervisor' | 'team_member'
export type TribeRole = 'admin' | 'moderator' | 'member'

interface RoleMapping {
  lmsRole: LMSRole
  tribeRole: TribeRole
  permissions: string[]
}

interface CompanyContext {
  companyId: string
  companyName: string
  tribeConnected?: boolean
}

const ROLE_MAPPINGS: Record<LMSRole, RoleMapping> = {
  executive: {
    lmsRole: 'executive',
    tribeRole: 'member',
    permissions: ['manage_users', 'manage_content', 'manage_settings', 'view_analytics']
  },
  supervisor: {
    lmsRole: 'supervisor',
    tribeRole: 'moderator',
    permissions: ['manage_team', 'create_content', 'view_analytics']
  },
  team_member: {
    lmsRole: 'team_member',
    tribeRole: 'member',
    permissions: ['view_content', 'create_posts']
  }
}

export async function syncUserRoles(firebaseUser: User, lmsRole: LMSRole, companyContext: CompanyContext) {
  try {
    const mapping = ROLE_MAPPINGS[lmsRole]
    if (!mapping) {
      throw new Error(`Invalid LMS role: ${lmsRole}`)
    }

    // Only attempt to sync with Tribe if the account is connected
    if (companyContext.tribeConnected) {
      const tribeUser = await getUser(firebaseUser.uid)
      if (!tribeUser) {
        throw new Error('Tribe account not found')
      }
    }

    return {
      ...mapping,
      userId: firebaseUser.uid,
      email: firebaseUser.email,
      companyId: companyContext.companyId,
      requiresTribeConnection: !companyContext.tribeConnected
    }
  } catch (error) {
    console.error('Error syncing user roles:', error)
    throw error
  }
}

export function getLMSPermissions(role: LMSRole): string[] {
  return ROLE_MAPPINGS[role]?.permissions || []
}

export function getTribeRole(lmsRole: LMSRole): TribeRole {
  return ROLE_MAPPINGS[lmsRole]?.tribeRole || 'member'
}

export function hasPermission(userRole: LMSRole, requiredPermission: string): boolean {
  const permissions = ROLE_MAPPINGS[userRole]?.permissions || []
  return permissions.includes(requiredPermission)
} 