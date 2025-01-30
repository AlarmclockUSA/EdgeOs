import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const { role, companyName } = await request.json()
    
    if (!role || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const linkId = uuidv4()
    const signupPath = role === 'supervisor' ? 'supervisorsignup' : 'teamsignup'
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/brilliant/${signupPath}?linkId=${linkId}`

    const companyRef = db.collection('companies').doc(companyName)
    const companyDoc = await companyRef.get()

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const inviteLinks = companyDoc.data()?.inviteLinks || {}
    inviteLinks[role] = {
      linkId,
      url: inviteLink,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiration
    }

    await companyRef.update({ inviteLinks })

    return NextResponse.json({ inviteLink })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}

