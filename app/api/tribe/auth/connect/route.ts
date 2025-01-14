import { NextResponse } from 'next/server'
import { tribeApiFetch } from '@/lib/tribe-api'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(request: Request) {
  try {
    const { userId, organizationName, password } = await request.json()

    // Verify credentials with Tribe
    const response = await tribeApiFetch('/auth/verify', {
      method: 'POST',
      body: {
        organizationName,
        password
      }
    })

    if (response.success) {
      // Store the Tribe organization ID in the user's Firebase document
      await updateDoc(doc(db, 'users', userId), {
        tribeOrganizationId: response.organizationId,
        tribeConnected: true
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Error connecting Tribe account:', error)
    return NextResponse.json(
      { error: 'Failed to connect Tribe account' },
      { status: 500 }
    )
  }
} 