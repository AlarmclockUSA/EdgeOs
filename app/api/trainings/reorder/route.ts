import { NextResponse } from 'next/server'
import { collection, query, where, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logServerError } from '@/lib/server-logger'

export async function POST(request: Request) {
  try {
    const { startDate } = await request.json()
    
    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }

    const trainingsRef = collection(db, 'trainings')
    const q = query(
      trainingsRef,
      where('companyName', '==', 'Brilliant Perspectives'),
      orderBy('title', 'asc')
    )
    const querySnapshot = await getDocs(q)
    
    const batch = writeBatch(db)
    let currentDate = new Date(startDate)

    querySnapshot.docs.forEach((doc, index) => {
      const trainingRef = doc.ref
      batch.update(trainingRef, { 
        trainingDate: new Date(currentDate.getTime() + index * 7 * 24 * 60 * 60 * 1000) 
      })
    })

    await batch.commit()

    return NextResponse.json({ message: 'Trainings reordered successfully' })
  } catch (error) {
    console.error('Error in POST /api/trainings/reorder:', error)
    logServerError(error, 'POST /api/trainings/reorder')
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

