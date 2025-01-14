'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, Firestore } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { CourseModal } from '@/components/course-modal'
import { WorksheetModal } from '@/components/worksheet-modal'
import { Video, FileText, CheckCircle, Clock, Search } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { tribeApiFetch } from '@/lib/tribe-api'
import Hls from 'hls.js'
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface Training {
  id: string
  title: string
  description: string
  videoLink: string
  trainingDate: Date
  tribeContentId?: string
  name: string
  date: string
  instructor: string
  videoUrl?: string
  featuredImage?: string
}

interface UserProgress {
  [trainingId: string]: {
    videoCompleted: boolean
    worksheetCompleted: boolean
  }
}

const VideoPlayer = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(videoRef.current)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(e => console.log('Playback not started yet'))
        })

        return () => {
          hls.destroy()
        }
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = url
      }
    }
  }, [url])

  return (
    <video
      ref={videoRef}
      className="w-full h-full rounded-t-lg object-cover"
      controls
      preload="none"
      playsInline
    />
  )
}

const VideoModal = ({ 
  isOpen, 
  onClose, 
  url, 
  title 
}: { 
  isOpen: boolean
  onClose: () => void
  url: string
  title: string 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <div className="aspect-video w-full">
          <VideoPlayer url={url} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TrainingLibrary() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isWorksheetModalOpen, setIsWorksheetModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    } else if (user) {
      fetchTrainings()
      fetchUserProgress()
    }
  }, [user, loading, router])

  const fetchTrainings = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching trainings...')
      const response = await fetch('/api/tribe/content')
      const collection = await response.json()
      
      console.log('API response:', {
        collectionData: collection,
        firstItem: collection.Contents?.[0],
        itemCount: collection.Contents?.length
      })

      if (!collection?.Contents?.length) {
        console.log('No items found in response')
        setTrainings([])
        return
      }

      // Transform content into our Training format
      const transformedTrainings = await Promise.all(collection.Contents.map(async (item: any) => {
        // Parse transcodingDataLP to get the HLS URL
        let videoUrl = null
        if (item.transcodingDataLP) {
          try {
            const transcodingData = JSON.parse(item.transcodingDataLP)
            if (transcodingData.hls) {
              // Use the root m3u8 file which contains all quality levels
              videoUrl = `https://cdn.tribesocial.io/${transcodingData.hls}`
              console.log('Video URL constructed:', {
                id: item.id,
                title: item.title,
                hls: transcodingData.hls,
                finalUrl: videoUrl
              })
            }
          } catch (e) {
            console.error('Error parsing transcodingDataLP:', e)
          }
        }

        // Get featured image URL if available
        let featuredImage = null
        if (item.featuredImageUrl) {
          featuredImage = `https://edge.tribesocial.io/${item.featuredImageUrl}`
          console.log('Featured image data:', {
            itemId: item.id,
            rawFeaturedImage: item.featuredImageUrl,
            constructedUrl: featuredImage,
            allImageFields: {
              featuredImage: item.featuredImage,
              featuredImageUrl: item.featuredImageUrl,
              image: item.image,
              imageUrl: item.imageUrl,
              thumbnail: item.thumbnail,
              thumbnailUrl: item.thumbnailUrl
            }
          })
        } else {
          console.log('No featured image for item:', {
            itemId: item.id,
            title: item.title,
            availableFields: Object.keys(item),
            imageRelatedFields: {
              featuredImage: item.featuredImage,
              featuredImageUrl: item.featuredImageUrl,
              image: item.image,
              imageUrl: item.imageUrl,
              thumbnail: item.thumbnail,
              thumbnailUrl: item.thumbnailUrl
            }
          })
        }

        const transformedItem = {
          id: item.id.toString(),
          title: item.title,
          description: item.descriptionPlain || item.description,
          trainingDate: new Date(item.publishedDate || item.createdAt),
          tribeContentId: item.id.toString(),
          name: item.title,
          date: new Date(item.publishedDate || item.createdAt).toLocaleDateString(),
          instructor: item.User?.name || 'Brilliant OS',
          videoUrl: videoUrl,
          featuredImage: featuredImage
        }

        console.log('Transformed item:', {
          id: transformedItem.id,
          title: transformedItem.title,
          hasFeaturedImage: !!transformedItem.featuredImage,
          featuredImageUrl: transformedItem.featuredImage
        })

        return transformedItem
      }))

      console.log('Transformed trainings:', transformedTrainings.map(t => ({
        id: t.id,
        title: t.title,
        videoUrl: t.videoUrl
      })))
      setTrainings(transformedTrainings)
    } catch (error: any) {
      console.error('Error fetching trainings:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
      toast({
        title: "Error",
        description: "Failed to fetch trainings. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserProgress = async () => {
    if (!user) return

    try {
      const progressRef = doc(db as Firestore, 'users', user.uid, 'progress', 'trainings')
      const progressDoc = await getDoc(progressRef)
      
      if (progressDoc.exists()) {
        setUserProgress(progressDoc.data() as UserProgress)
      }
    } catch (error) {
      console.error('Error fetching user progress:', error)
      toast({
        title: "Error",
        description: "Failed to fetch your progress. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleVideoComplete = async () => {
    if (selectedTraining && user) {
      try {
        const progressRef = doc(db as Firestore, 'users', user.uid, 'progress', 'trainings')
        await setDoc(progressRef, {
          [selectedTraining.id]: {
            ...userProgress[selectedTraining.id],
            videoCompleted: true,
            lastUpdated: new Date()
          }
        }, { merge: true })

        // Track view in Tribe analytics
        if (selectedTraining.tribeContentId) {
          await tribeApiFetch('/analytics/views', {
            method: 'POST',
            body: { contentId: selectedTraining.tribeContentId }
          })
        }

        setUserProgress(prev => ({
          ...prev,
          [selectedTraining.id]: {
            ...prev[selectedTraining.id],
            videoCompleted: true
          }
        }))

        toast({
          title: "Video Completed",
          description: "Your progress has been saved.",
        })
      } catch (error) {
        console.error('Error marking video as completed:', error)
        toast({
          title: "Error",
          description: "Failed to update progress. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleWorksheetSubmit = async () => {
    if (selectedTraining && user) {
      try {
        const progressRef = doc(db as Firestore, 'users', user.uid, 'progress', 'trainings')
        await setDoc(progressRef, {
          [selectedTraining.id]: {
            ...userProgress[selectedTraining.id],
            worksheetCompleted: true,
            lastUpdated: new Date()
          }
        }, { merge: true })

        setUserProgress(prev => ({
          ...prev,
          [selectedTraining.id]: {
            ...prev[selectedTraining.id],
            worksheetCompleted: true
          }
        }))

        toast({
          title: "Worksheet Submitted",
          description: "Your progress has been saved.",
        })
      } catch (error) {
        console.error('Error marking worksheet as completed:', error)
        toast({
          title: "Error",
          description: "Failed to update progress. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const onOpenVideo = (training: Training) => {
    setSelectedTraining(training)
    setIsVideoModalOpen(true)
  }

  const onOpenWorksheet = (training: Training) => {
    setSelectedTraining(training)
    setIsWorksheetModalOpen(true)
  }

  const sortTrainings = (a: Training, b: Training) => {
    return b.trainingDate.getTime() - a.trainingDate.getTime()
  }

  const filteredTrainings = trainings
    .filter(training =>
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(sortTrainings)

  const handleVideoClick = (training: Training) => {
    if (training.videoUrl) {
      setSelectedVideo({
        url: training.videoUrl,
        title: training.title
      })
    }
  }

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTrainings.map((training) => {
        const progress = userProgress[training.id] || { videoCompleted: false, worksheetCompleted: false }
        const completionPercentage = 
          ((progress.videoCompleted ? 1 : 0) + (progress.worksheetCompleted ? 1 : 0)) * 50

        return (
          <Card key={training.id} className="flex flex-col bg-white border-0">
            <div 
              className="w-full aspect-video bg-muted rounded-t-lg cursor-pointer overflow-hidden"
              onClick={() => handleVideoClick(training)}
            >
              {training.featuredImage ? (
                <img 
                  src={training.featuredImage} 
                  alt={training.title}
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                />
              ) : training.videoUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-gray-900">
                <span className="text-xl text-gray-900">{training.title}</span>
                {progress.videoCompleted && progress.worksheetCompleted ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-500" />
                )}
              </CardTitle>
              <CardDescription>
                <div className="text-sm text-gray-600 h-[100px] overflow-y-auto">
                  <div className="line-clamp-5">
                    {training.description}
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <p className="text-sm text-gray-600">{training.trainingDate.toLocaleDateString()}</p>
              <Progress value={completionPercentage} className="w-full" />
              <div className="space-y-2">
                <div className="flex items-center">
                  <Video className={`mr-2 h-4 w-4 ${progress.videoCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${progress.videoCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {progress.videoCompleted ? 'Video Completed' : 'Video Not Watched'}
                  </span>
                </div>
                <div className="flex items-center">
                  <FileText className={`mr-2 h-4 w-4 ${progress.worksheetCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${progress.worksheetCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {progress.worksheetCompleted ? 'Worksheet Completed' : 'Worksheet Not Submitted'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 w-full">
                {training.videoUrl && (
                  <Button
                    className="flex-1"
                    onClick={() => handleVideoClick(training)}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    {progress.videoCompleted ? 'Rewatch' : 'Watch'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenWorksheet(training)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {progress.worksheetCompleted ? 'Review' : 'Complete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Training Library</h1>
      
      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search trainings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-white text-gray-900 border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredTrainings.length > 0 ? (
        renderCardView()
      ) : (
        <p className="text-center text-muted-foreground">No trainings found.</p>
      )}

      {selectedTraining && (
        <>
          <CourseModal
            isOpen={isVideoModalOpen}
            onClose={() => {
              setIsVideoModalOpen(false)
              setSelectedTraining(null)
            }}
            course={selectedTraining}
            nextTrainingDate={null}
            onVideoComplete={handleVideoComplete}
          />
          <WorksheetModal
            isOpen={isWorksheetModalOpen}
            onClose={() => {
              setIsWorksheetModalOpen(false)
              setSelectedTraining(null)
            }}
            worksheetId={selectedTraining.id}
            onSubmit={handleWorksheetSubmit}
          />
        </>
      )}

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          url={selectedVideo.url}
          title={selectedVideo.title}
        />
      )}
    </div>
  )
}

