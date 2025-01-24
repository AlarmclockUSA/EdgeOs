'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, Firestore } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { WorksheetModal } from '@/components/worksheet-modal'
import { Video, Search, CheckCircle, Clock, FileText } from 'lucide-react'
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
    lastUpdated: Date | null
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
      crossOrigin="anonymous"
    >
      <track
        kind="subtitles"
        label="English"
        srcLang="en"
        src=""
        default
      />
      Your browser does not support the video tag.
    </video>
  )
}

const VideoModal = ({ 
  isOpen, 
  onClose, 
  url, 
  title,
  isCompleted,
  onMarkAsWatched
}: { 
  isOpen: boolean
  onClose: () => void
  url: string
  title: string
  isCompleted: boolean
  onMarkAsWatched: () => void
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <div className="aspect-video w-full">
          <VideoPlayer url={url} />
        </div>
        <div className="p-4 bg-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Watched</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Not watched yet</span>
              </>
            )}
          </div>
          {!isCompleted && (
            <Button onClick={onMarkAsWatched}>
              Mark as Watched
            </Button>
          )}
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
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string; id: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    } else if (user) {
      fetchTrainings()
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && trainings.length > 0) {
      fetchUserProgress()
    }
  }, [user, trainings])

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
              videoUrl = `https://cdn.tribesocial.io/${transcodingData.hls}`
            }
          } catch (e) {
            console.error('Error parsing transcodingDataLP:', e)
          }
        }

        // Get featured image URL if available
        let featuredImage = null
        if (item.featuredImage) {
          featuredImage = `https://cdn.tribesocial.io/${item.featuredImage}`
        } else if (item.coverImage) {
          featuredImage = `https://cdn.tribesocial.io/${item.coverImage}`
        } else if (item.imageUrl) {
          featuredImage = item.imageUrl.startsWith('http') ? item.imageUrl : `https://cdn.tribesocial.io/${item.imageUrl}`
        } else if (item.image) {
          featuredImage = `https://cdn.tribesocial.io/${item.image}`
        }

        // Parse module and video numbers from the title
        const titleMatch = item.title.match(/(\d+)\.(\d+)\s+(.+)/)
        const moduleNumber = titleMatch ? titleMatch[1] : '1'
        const videoNumber = titleMatch ? titleMatch[2] : '1'
        const videoTitle = titleMatch ? titleMatch[3] : item.title

        const transformedItem = {
          id: item.id.toString(),
          title: videoTitle,
          description: item.descriptionPlain || item.description,
          trainingDate: new Date(item.publishedDate || item.createdAt),
          tribeContentId: item.id.toString(),
          name: videoTitle,
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
      const progressRef = doc(db, `users/${user.uid}/progress/trainings`)
      const progressDoc = await getDoc(progressRef)
      if (progressDoc.exists()) {
        const progressData = progressDoc.data()
        console.log('Fetched progress data:', progressData)
        setUserProgress(progressData)
      } else {
        console.log('No progress data found')
        setUserProgress({})
      }
    } catch (error) {
      console.error('Error fetching user progress:', error)
      setUserProgress({})
    }
  }

  const handleVideoClick = (training: Training) => {
    if (training.videoUrl) {
      setSelectedVideo({
        url: training.videoUrl,
        title: training.title,
        id: training.id
      })
    }
  }

  const handleVideoComplete = async (trainingId: string) => {
    if (!user) return

    try {
      // Store video ID before closing modal
      const videoId = trainingId
      
      // Close the modal first
      setSelectedVideo(null)

      // Update progress in Firestore
      const progressRef = doc(db as Firestore, 'users', user.uid, 'progress', 'trainings')
      await setDoc(progressRef, {
        [videoId]: {
          ...userProgress[videoId],
          videoCompleted: true,
          lastUpdated: new Date()
        }
      }, { merge: true })

      // Update local state
      setUserProgress(prev => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          videoCompleted: true,
          lastUpdated: new Date()
        }
      }))

      toast({
        title: "Video Marked as Watched",
        description: "Your progress has been saved.",
      })
    } catch (error) {
      console.error('Error marking video as completed:', error)
      
      // Show error toast with more specific message
      let errorMessage = "Failed to update progress. Please try again."
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = "You don't have permission to update this video's status."
        } else if (error.message.includes('not-found')) {
          errorMessage = "Could not find the video progress record."
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleWorksheetSubmit = async () => {
    if (selectedTraining && user) {
      try {
        const progressRef = doc(db as Firestore, 'users', user.uid, 'progress', 'trainings')
        const now = new Date()
        await setDoc(progressRef, {
          [selectedTraining.id]: {
            ...userProgress[selectedTraining.id],
            worksheetCompleted: true,
            lastUpdated: now
          }
        }, { merge: true })

        setUserProgress(prev => ({
          ...prev,
          [selectedTraining.id]: {
            ...prev[selectedTraining.id],
            worksheetCompleted: true,
            lastUpdated: now
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
    const getDateValue = (date: Date | string | { toDate: () => Date } | { seconds: number }) => {
      if (date instanceof Date) {
        return date.getTime()
      }
      if (typeof date === 'string') {
        return new Date(date).getTime()
      }
      if ('toDate' in date && typeof date.toDate === 'function') {
        return date.toDate().getTime()
      }
      if ('seconds' in date) {
        return date.seconds * 1000
      }
      return 0
    }
    
    return getDateValue(a.trainingDate) - getDateValue(b.trainingDate)
  }

  const filteredTrainings = trainings
    .filter(training =>
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(sortTrainings)

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTrainings.map((training) => {
        const progress = userProgress[training.id] || { videoCompleted: false, worksheetCompleted: false, lastUpdated: null }
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
              <Progress value={completionPercentage} className="w-full" />
              <div className="space-y-2">
                <div className="flex items-center">
                  <Video className={`mr-2 h-4 w-4 ${progress.videoCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${progress.videoCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {progress.videoCompleted ? 'Video Watched' : 'Video Not Watched'}
                  </span>
                </div>
                <div className="flex items-center">
                  <FileText className={`mr-2 h-4 w-4 ${progress.worksheetCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${progress.worksheetCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {progress.worksheetCompleted ? 'Worksheet Submitted' : 'Worksheet Not Submitted'}
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
    <div>
      {/* Hero Section */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0056D2] to-[#EAF4FE] py-8">
        <div className="px-8">
          <h1 className="text-2xl font-semibold text-white">Learning Library</h1>
          <p className="text-white/80 mt-2">Explore and complete your training modules</p>
          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search trainings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-white text-gray-900 border-0 focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
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
          <WorksheetModal
            isOpen={isWorksheetModalOpen}
            onClose={() => {
              setIsWorksheetModalOpen(false)
              setSelectedTraining(null)
            }}
            worksheetId={selectedTraining.id}
            onSubmit={handleWorksheetSubmit}
          />
        )}

        {selectedVideo && (
          <VideoModal
            isOpen={!!selectedVideo}
            onClose={() => setSelectedVideo(null)}
            url={selectedVideo.url}
            title={selectedVideo.title}
            isCompleted={userProgress[selectedVideo.id]?.videoCompleted || false}
            onMarkAsWatched={() => handleVideoComplete(selectedVideo.id)}
          />
        )}
      </div>
    </div>
  )
}

