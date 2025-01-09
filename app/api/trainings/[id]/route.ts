import { NextResponse } from 'next/server'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logServerError } from '@/lib/server-logger'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const data = await request.json()

    const trainingRef = doc(db, 'trainings', id)
    await updateDoc(trainingRef, {
      title: data.title,
      description: data.description,
      videoLink: data.videoLink,
      trainingDate: new Date(data.trainingDate),
      updatedAt: new Date(),
    })

    return NextResponse.json({ message: 'Training updated successfully' })
  } catch (error) {
    console.error('Error in PUT /api/trainings/[id]:', error)
    logServerError(error, 'PUT /api/trainings/[id]')
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

