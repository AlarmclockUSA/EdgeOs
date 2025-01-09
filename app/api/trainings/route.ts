import { NextResponse } from 'next/server'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logServerError } from '@/lib/server-logger'

export async function GET(request: Request) {
  try {
    const trainingsRef = collection(db, 'trainings')
    const q = query(
      trainingsRef,
      where('companyName', '==', 'Brilliant Perspectives'),
      orderBy('trainingDate', 'asc')
    )
    const querySnapshot = await getDocs(q)
    const trainings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      trainingDate: doc.data().trainingDate?.toDate().toISOString() || null,
      createdAt: doc.data().createdAt?.toDate().toISOString() || null,
    }))
    return NextResponse.json({ trainings })
  } catch (error) {
    console.error('Error in GET /api/trainings:', error)
    logServerError(error, 'GET /api/trainings')
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

