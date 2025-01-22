import { NextResponse } from 'next/server'
import { tribeApiFetch } from '@/lib/tribe-api'
import { TribeRole } from '@/lib/auth/role-mapping'

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { role } = await request.json() as { role: TribeRole }
    
    // Update user role in Tribe
    await tribeApiFetch(`/users/${params.userId}`, {
      method: 'PUT',
      body: {
        role: role
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user role in Tribe:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
} 