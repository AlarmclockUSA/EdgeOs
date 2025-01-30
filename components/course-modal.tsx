'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Video } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from '@/components/ui/use-toast'

interface CourseModalProps {
  isOpen: boolean
  onClose: () => void
  course: {
    id: string
    name: string
    date: string
    instructor: string
    videoUrl?: string
  }
  nextTrainingDate: string | null
  onVideoComplete?: () => void
}

export function CourseModal({ isOpen, onClose, course, nextTrainingDate, onVideoComplete }: CourseModalProps) {
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchVideoUrlAndCheckCompletion = async () => {
      if (user && course?.id) {
        try {
          setLoading(true)
          // Fetch video URL from training collection
          const trainingRef = doc(db, 'trainings', course.id)
          const trainingDoc = await getDoc(trainingRef)
          if (trainingDoc.exists()) {
            setVideoUrl(trainingDoc.data().videoLink || null)
          }

          // Check video completion status
          const progressRef = doc(db, 'userProgress', `${user.uid}_${course.id}`)
          const progressDoc = await getDoc(progressRef)
          if (progressDoc.exists()) {
            setVideoCompleted(progressDoc.data().videoCompleted)
          }
        } catch (error) {
          console.error('Error fetching video URL or checking completion:', error)
          let errorMessage = "Failed to load video or check completion status. Please try again later."
          if (error instanceof Error && error.name === "FirebaseError" && error.code === "permission-denied") {
            errorMessage = "You don't have permission to access this information. Please check your authentication status."
          }
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }
    fetchVideoUrlAndCheckCompletion()
  }, [user, course?.id])

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!user || !course) return
      
      try {
        const progressRef = doc(db, `users/${user.uid}/progress/${course.id}`)
        const progressDoc = await getDoc(progressRef)
        if (progressDoc.exists()) {
          const data = progressDoc.data() as UserProgress
          setVideoCompleted(data.videoCompleted || false)
        }
      } catch (error) {
        console.error('Error fetching user progress:', error)
      }
    }

    fetchUserProgress()
  }, [user, course])

  const handleComplete = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to mark a video as completed.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const progressRef = doc(db, `users/${user.uid}/progress/${course.id}`)
      await setDoc(progressRef, {
        videoCompleted: true,
        worksheetCompleted: false,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setVideoCompleted(true)
      toast({
        title: "Video Completed",
        description: "Your progress has been saved.",
      })
    
    // Update the weeklyTraining state in the parent component
    if (onVideoComplete) {
      onVideoComplete()
    }
  } catch (error) {
    console.error('Error marking video as completed:', error)
    let errorMessage = "Failed to mark video as completed. Please try again."
    if (error instanceof Error) {
      if (error.name === "FirebaseError") {
        switch (error.code) {
          case "permission-denied":
            errorMessage = "You don't have permission to perform this action. Please check your authentication status."
            break;
          case "unauthenticated":
            errorMessage = "You are not authenticated. Please sign in and try again."
            break;
          default:
            errorMessage = `Firebase error: ${error.message}`
        }
      } else {
        errorMessage = error.message
      }
    }
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{course.name}</DialogTitle>
          <DialogDescription>
            <strong>
              {videoCompleted ? "Review the training video and your completion status." : "Watch the training video and mark it as completed when you're done."}
            </strong>
            {nextTrainingDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Next training available: {nextTrainingDate}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="aspect-video">
            {videoUrl ? (
              <div className="w-full h-full bg-black flex flex-col items-center justify-center rounded-md">
                <video
                  className="w-full h-full rounded-md"
                  controls
                  preload="none"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center rounded-md">
                <Video className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No video available</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Video className={videoCompleted ? 'text-green-500' : 'text-red-500'} />
              <span className={videoCompleted 
                ? 'text-green-500' 
                : 'bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold'}>
                {loading ? 'Checking status...' : (videoCompleted ? 'Completed' : 'Not watched yet')}
              </span>
            </div>
            {!videoCompleted && (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? 'Loading...' : 'Mark as Complete'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

