import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'

interface ProgressData {
  worksheetId: string
  isCompleted: boolean
  answers?: Record<string, string>
}

interface VideoProgressData {
  videoId: string
  isCompleted: boolean
  watchedPercentage: number
}

export async function updateWorksheetProgress(userId: string, progressData: ProgressData) {
  const progressRef = doc(db, 'users', userId, 'worksheetProgress', progressData.worksheetId)
  await setDoc(progressRef, progressData, { merge: true })
}

export async function getWorksheetProgress(userId: string, worksheetId: string) {
  const progressRef = doc(db, 'users', userId, 'worksheetProgress', worksheetId)
  const progressDoc = await getDoc(progressRef)
  return progressDoc.exists() ? progressDoc.data() as ProgressData : null
}

export async function updateVideoProgress(userId: string, progressData: VideoProgressData) {
  const progressRef = doc(db, 'users', userId, 'videoProgress', progressData.videoId)
  await setDoc(progressRef, progressData, { merge: true })
}

export async function getVideoProgress(userId: string, videoId: string) {
  const progressRef = doc(db, 'users', userId, 'videoProgress', videoId)
  const progressDoc = await getDoc(progressRef)
  return progressDoc.exists() ? progressDoc.data() as VideoProgressData : null
}

export async function getUserOverallProgress(userId: string) {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    throw new Error('User not found')
  }

  const userData = userDoc.data()
  return {
    totalWorksheets: userData.totalWorksheets || 0,
    completedWorksheets: userData.completedWorksheets || 0,
    totalVideos: userData.totalVideos || 0,
    completedVideos: userData.completedVideos || 0
  }
}

export async function updateUserOverallProgress(userId: string, type: 'worksheet' | 'video', isCompleted: boolean) {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    throw new Error('User not found')
  }

  const userData = userDoc.data()
  const updateData: Record<string, number> = {}

  if (type === 'worksheet') {
    updateData.totalWorksheets = (userData.totalWorksheets || 0) + 1
    if (isCompleted) {
      updateData.completedWorksheets = (userData.completedWorksheets || 0) + 1
    }
  } else if (type === 'video') {
    updateData.totalVideos = (userData.totalVideos || 0) + 1
    if (isCompleted) {
      updateData.completedVideos = (userData.completedVideos || 0) + 1
    }
  }

  await updateDoc(userRef, updateData)
}

