import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Video } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

interface CourseModalProps {
  isOpen: boolean
  onClose: () => void
  course: {
    id: string
    name: string
    date: string
    instructor: string
    videoUrl?: string
    videoLink?: string
  }
  nextTrainingDate: string | null
  onVideoComplete?: () => void
}

export function CourseModal({ isOpen, onClose, course, nextTrainingDate, onVideoComplete }: CourseModalProps) {
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchVideoUrlAndCheckCompletion = async () => {
      if (user && course?.id) {
        try {
          setLoading(true)
          console.log('Opening modal for course:', {
            courseId: course.id,
            courseName: course.name,
            existingVideoUrl: course.videoUrl,
            existingVideoLink: course.videoLink
          })

          // Fetch content from Tribe API
          const response = await fetch(`/api/tribe/content/${course.id}`)
          const contentData = await response.json()
          
          console.log('Modal content response:', {
            contentData,
            status: response.status,
            hasVideoUrl: !!contentData.videoUrl,
            hasFeaturedImage: !!contentData.featuredImage
          })

          if (!contentData.videoUrl) {
            console.error('No video URL found in content data')
          }
          
          // Set video and featured image URLs
          setVideoUrl(contentData.videoUrl ? `https://cdn.tribesocial.io/${contentData.videoUrl}` : null)
          setFeaturedImage(contentData.featuredImage ? `https://edge.tribesocial.io/${contentData.featuredImage}` : null)

          // Check video completion status
          const progressRef = doc(db, 'userProgress', `${user.uid}_${course.id}`)
          const progressDoc = await getDoc(progressRef)
          if (progressDoc.exists()) {
            setVideoCompleted(progressDoc.data().videoCompleted)
          }
        } catch (error) {
          console.error('Error in modal:', error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchVideoUrlAndCheckCompletion()
  }, [user, course])

  console.log('Modal render state:', {
    loading,
    hasVideoUrl: !!videoUrl,
    videoUrl,
    isCompleted: videoCompleted
  })

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
                {videoUrl.includes('iframe') ? (
                  <div dangerouslySetInnerHTML={{ __html: videoUrl }} className="w-full h-full" />
                ) : (
                  <video
                    className="w-full h-full rounded-md vjs-tech"
                    controls
                    preload="none"
                    playsInline
                    tabIndex={-1}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center rounded-md">
                {featuredImage ? (
                  <img 
                    src={featuredImage} 
                    alt={course.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <>
                    <Video className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No video available</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 