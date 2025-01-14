import { NextResponse } from 'next/server'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(request: Request) {
  try {
    const { userId, companyCode } = await request.json()

    // Find company by code
    const companiesRef = collection(db, 'companies')
    const q = query(companiesRef, where('joinCode', '==', companyCode))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid company code' },
        { status: 404 }
      )
    }

    const companyDoc = querySnapshot.docs[0]
    const companyData = companyDoc.data()

    return NextResponse.json({
      success: true,
      companyId: companyDoc.id,
      companyName: companyData.name
    })
  } catch (error) {
    console.error('Error joining company:', error)
    return NextResponse.json(
      { error: 'Failed to join company' },
      { status: 500 }
    )
  }
} 