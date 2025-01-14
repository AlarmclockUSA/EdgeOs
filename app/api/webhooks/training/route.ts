import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'

export async function POST(req: Request) {
  try {
    const { title, videoUrl } = await req.json()

    // Validate the incoming data
    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Add the new training to Firestore
    const trainingRef = collection(db, 'trainings')
    const newTraining = await addDoc(trainingRef, {
      title,
      videoLink: videoUrl,
      createdAt: new Date(),
      // Add any other default fields you need
    })

    return NextResponse.json({ message: 'Training added successfully', id: newTraining.id })
  } catch (error) {
    console.error('Error adding training:', error)
    return NextResponse.json({ error: 'Failed to add training' }, { status: 500 })
  }
}

