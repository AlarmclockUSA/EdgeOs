'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Star, Video, ClipboardCheck, CheckCircle, Info, PlusIcon, ChevronLeft, ChevronRight, FileText, Clock, Menu, BookOpen, Library, Target, Settings, Users, LayoutDashboard, Building, Cog, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CourseModal } from '@/components/course-modal'
import { WorksheetModal } from '@/components/worksheet-modal'
import { BoldActionModal } from '@/components/bold-action-modal'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, increment, setDoc } from 'firebase/firestore'
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { AdminDebugMenu } from '@/components/admin-debug-menu'
import { FirebaseError } from 'firebase/app'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StyledCard } from '@/components/StyledCard'
import Hls from 'hls.js'
import { VideoModal } from '@/components/video-modal'
import { tribeApiFetch } from '@/lib/tribe-api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { auth } from '@/lib/firebase'
import { VideoModule } from '@/components/video-module'

interface Training {
  id: string
  title: string
  description: string
  videoUrl?: string
  trainingDate: Date
  tribeContentId?: string
  name: string
  date: string
  instructor: string
  featuredImage?: string
}

interface UserProgress {
  videoCompleted: boolean
  worksheetCompleted: boolean
}

interface BoldAction {
  id: string
  action: string
  timeframe: string
  completedAt: Date | { toDate: () => Date } | null
  createdAt: Date | { toDate: () => Date } | null
  status?: string
  actualTimeframe?: string
  reflectionNotes?: string
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

export default function Dashboard() {
  const { user, userRole, loading, companyName } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false)
  const [isWorksheetModalOpen, setIsWorksheetModalOpen] = useState(false)
  const [isBoldActionModalOpen, setIsBoldActionModalOpen] = useState(false)
  const [weeklyTraining, setWeeklyTraining] = useState<any>(null)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [worksheetCompleted, setWorksheetCompleted] = useState(false)
  const [boldActions, setBoldActions] = useState<BoldAction[]>([])
  const [completedBoldActions, setCompletedBoldActions] = useState(0)
  const [completedBoldActionsYTD, setCompletedBoldActionsYTD] = useState(0)
  const [boldActionToView, setBoldActionToView] = useState<BoldAction | null>(null)
  const [isBoldActionsLoading, setIsBoldActionsLoading] = useState(false)
  const [companyProgress, setCompanyProgress] = useState({
    totalUsers: 0,
    totalCompletedBoldActions: 0,
    remainingActions: 0
  })
  const [leaderboard, setLeaderboard] = useState<Array<{ name: string; score: number; avatar: string }>>([])
  const [nextTrainingDate, setNextTrainingDate] = useState<string | null>(null)
  const [selectedTraining, setSelectedTraining] = useState<any>(null)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({})
  const [currentTrainingIndex, setCurrentTrainingIndex] = useState(0)
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string; id: string } | null>(null)

  const currentTraining = trainings[currentTrainingIndex]
  const progress = currentTraining ? userProgress[currentTraining.id] || { videoCompleted: false, worksheetCompleted: false } : null

  const navigationItems = {
    team_member: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'Account Settings', href: '/account', icon: Settings }
    ],
    supervisor: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'My Team', href: '/supervisor', icon: Users },
      ...(companyName === 'Brilliant Perspectives' ? [{ name: 'Admin', href: '/admin', icon: LayoutDashboard }] : []),
      { name: 'Account Settings', href: '/account', icon: Settings }
    ],
    executive: [
      { name: 'My Learning', href: '/', icon: BookOpen },
      { name: 'Training Library', href: '/training-library', icon: Library },
      { name: 'Bold Actions', href: '/bold-actions', icon: Target },
      { name: 'My Team', href: '/supervisor', icon: Users },
      { name: 'Executive Dashboard', href: '/executive', icon: Building },
      ...(companyName === 'Brilliant Perspectives' ? [{ name: 'Admin', href: '/admin', icon: LayoutDashboard }] : []),
      { name: 'Company Settings', href: '/company-settings', icon: Cog },
      { name: 'Account Settings', href: '/account', icon: Settings }
    ]
  }

  const navigation = navigationItems[userRole as keyof typeof navigationItems] || []

  const fetchBoldActions = async () => {
    if (user) {
      setIsBoldActionsLoading(true)
      try {
        console.log("Fetching bold actions for user:", user.uid)
        const boldActionsRef = collection(db, `users/${user.uid}/boldActions`)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        const q = query(
          boldActionsRef,
          orderBy('createdAt', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        const actions = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(action => {
            const createdAt = action.createdAt?.toDate?.() || new Date(action.createdAt)
            return createdAt >= oneYearAgo
          })
        
        console.log("Fetched bold actions:", actions)
        setBoldActions(actions)
        
        // Update completed count - only count actions that were completed this year
        const completedThisYear = actions.filter(action => {
          if (action.status !== 'completed') return false
          const completedAt = action.completedAt?.toDate?.() || new Date(action.completedAt)
          return completedAt >= oneYearAgo
        }).length
        setCompletedBoldActionsYTD(completedThisYear)
        
      } catch (error) {
        console.error('Error fetching bold actions:', error)
        if (error instanceof FirebaseError) {
          console.error("Firebase error code:", error.code)
          console.error("Firebase error message:", error.message)
        }
        toast({
          title: "Error",
          description: "Failed to fetch bold actions. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsBoldActionsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    } else if (user) {
      const fetchUserData = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setFirstName(userDoc.data().firstName || '')
        }
      }
      fetchUserData()
      fetchTrainings()
      fetchBoldActions()
    }
  }, [user, loading, router])

  const fetchTrainings = async () => {
    if (!user) return
    
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
        if (item.featuredImage) {
          featuredImage = `https://cdn.tribesocial.io/${item.featuredImage}`
        } else if (item.coverImage) {
          featuredImage = `https://cdn.tribesocial.io/${item.coverImage}`
        } else if (item.imageUrl) {
          featuredImage = item.imageUrl.startsWith('http') ? item.imageUrl : `https://cdn.tribesocial.io/${item.imageUrl}`
        } else if (item.image) {
          featuredImage = `https://cdn.tribesocial.io/${item.image}`
        }

        console.log('Image data for item:', {
          itemId: item.id,
          title: item.title,
          featuredImage: item.featuredImage,
          coverImage: item.coverImage,
          imageUrl: item.imageUrl,
          image: item.image,
          finalImageUrl: featuredImage,
          availableFields: Object.keys(item)
        })

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

      // Fetch user progress and find next training
      const progressRef = doc(db, 'users', user.uid, 'progress', 'trainings')
      const progressDoc = await getDoc(progressRef)
      const progressData = progressDoc.exists() ? progressDoc.data() as Record<string, UserProgress> : {}
      setUserProgress(progressData)

      // Find the next training after the last completed one
      const sortedTrainings = transformedTrainings.sort((a, b) => a.trainingDate.getTime() - b.trainingDate.getTime())
      const lastCompletedTraining = sortedTrainings.reduce<Training | null>((last, current) => {
        const progress = progressData[current.id] as UserProgress | undefined
        if (progress?.videoCompleted && progress?.worksheetCompleted) {
          return current
        }
        return last
      }, null)

      const nextTrainingIndex = lastCompletedTraining 
        ? sortedTrainings.findIndex(t => t.id === lastCompletedTraining.id) + 1
        : 0

      if (nextTrainingIndex < sortedTrainings.length) {
        setCurrentTrainingIndex(nextTrainingIndex)
      }
    } catch (error) {
      console.error('Error fetching trainings:', error)
      toast({
        title: "Error",
        description: "Failed to fetch trainings. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handlePreviousTraining = () => {
    setCurrentTrainingIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex))
  }

  const handleNextTraining = () => {
    setCurrentTrainingIndex((prevIndex) => (prevIndex < trainings.length - 1 ? prevIndex + 1 : prevIndex))
  }

  const handleVideoClick = (training: Training) => {
    if (training.videoUrl) {
      setSelectedVideo({
        url: training.videoUrl,
        title: training.title,
        id: training.id
      })
    } else {
      toast({
        title: "Video Unavailable",
        description: "This training video is not available yet.",
        variant: "destructive",
      })
    }
  }

  const handleOpenWorksheet = (training: Training) => {
    setSelectedTraining(training)
    setIsWorksheetModalOpen(true)
  }

  const handleVideoComplete = useCallback(async () => {
    if (user && selectedVideo) {
      try {
        // Store video ID before closing modal
        const videoId = selectedVideo.id
        
        // Close the modal first
        setSelectedVideo(null)

        // Update Firestore
        const progressRef = doc(db, 'users', user.uid, 'progress', 'trainings')
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

        // Show success toast
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
  }, [user, selectedVideo, userProgress])

  const handleWorksheetSubmit = useCallback(async (newBoldActionId: string) => {
    if (user && selectedTraining) {
      try {
        // Update progress in user's subcollection
        const progressRef = doc(db, `users/${user.uid}/progress/trainings`)
        const now = new Date()
        await setDoc(progressRef, {
          [selectedTraining.id]: {
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
          description: "Your worksheet has been successfully submitted.",
        })
        await fetchBoldActions()
      } catch (error) {
        console.error("Error updating worksheet completion status:", error)
        toast({
          title: "Error",
          description: "Failed to update worksheet completion status. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [user, selectedTraining, fetchBoldActions])

  const fetchCompanyProgress = useCallback(async () => {
    if (!companyName) {
      console.error('Company name is not available')
      return
    }

    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('companyName', '==', companyName))
      const querySnapshot = await getDocs(q)

      let totalUsers = 0
      let totalCompletedBoldActions = 0

      querySnapshot.forEach((doc) => {
        totalUsers++
        totalCompletedBoldActions += doc.data().completedBoldActions || 0
      })

      const totalPossibleActions = totalUsers * 48
      const remainingActions = totalPossibleActions - totalCompletedBoldActions

      setCompanyProgress({
        totalUsers,
        totalCompletedBoldActions,
        remainingActions
      })
    } catch (error) {
      console.error('Error fetching company progress:', error)
      toast({
        title: "Error",
        description: "Failed to fetch company progress. Please try again later.",
        variant: "destructive",
      })
    }
  }, [companyName])

  useEffect(() => {
    if (companyName) {
      fetchCompanyProgress()
    }
  }, [companyName, fetchCompanyProgress])

  const fetchLeaderboard = async () => {
    if (!companyName) {
      console.log('Company name is not available. Skipping leaderboard fetch.')
      setLeaderboard([])
      return
    }
    
    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('companyName', '==', companyName), orderBy('completedBoldActions', 'desc'), limit(3))
      const querySnapshot = await getDocs(q)
      
      const leaderboardData = querySnapshot.docs
        .map(doc => {
          const data = doc.data()
          return {
            name: `${data.firstName} ${data.lastName}`,
            score: data.completedBoldActions || 0,
            avatar: data.avatar || '/placeholder.svg?height=32&width=32'
          }
        })
        .filter(user => user.score > 0)
      
      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      if (error instanceof FirebaseError) {
        if (error.code === 'failed-precondition') {
          console.log('This error might be due to missing composite index. Check Firestore indexes.')
          setLeaderboard([])
          toast({
            title: "Leaderboard Unavailable",
            description: "We're setting up the leaderboard. Please check back later.",
            variant: "default",
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch leaderboard data. Please try again later.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        })
      }
    }
  }

  useEffect(() => {
    if (companyName) {
      fetchLeaderboard()
    }
  }, [companyName])

  const handleBoldActionComplete = useCallback(async (actionId: string) => {
    if (user) {
      setIsBoldActionsLoading(true)
      try {
        // Update the bold action status in Firestore
        const boldActionRef = doc(db, 'boldActions', actionId)
        await updateDoc(boldActionRef, {
          status: 'completed',
          completedAt: new Date()
        })

        // Increment the completed bold actions count
        setCompletedBoldActions((prev) => prev + 1)

        // Update the user document in Firestore
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          completedBoldActions: increment(1)
        })

        // Fetch updated bold actions
        await fetchBoldActions()

        // Update company progress
        await fetchCompanyProgress()

        toast({
          title: "Bold Action Completed",
          description: "Your bold action has been marked as completed.",
          variant: "default",
        })
      } catch (error) {
        console.error('Error completing bold action:', error)
        toast({
          title: "Error",
          description: "Failed to complete bold action. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsBoldActionsLoading(false)
      }
    }
  }, [user, fetchBoldActions, fetchCompanyProgress])

  useEffect(() => {
    fetchBoldActions()
  }, [user])

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!user || !currentTraining) return
      
      try {
        const progressRef = doc(db, `users/${user.uid}/progress/${currentTraining.id}`)
        const progressDoc = await getDoc(progressRef)
        if (progressDoc.exists()) {
          const data = progressDoc.data() as UserProgress
          setVideoCompleted(data.videoCompleted || false)
          setWorksheetCompleted(data.worksheetCompleted || false)
        }
      } catch (error) {
        console.error('Error fetching user progress:', error)
      }
    }

    fetchUserProgress()
  }, [user, currentTraining])

  if (!user) {
    return null
  }

  console.log('Current training:', {
    title: currentTraining?.title,
    hasVideoUrl: !!currentTraining?.videoUrl,
    videoUrl: currentTraining?.videoUrl,
    progress
  })

  return (
    <div>
      {/* Video Module at the top - completely flush */}
      {currentTraining && (
        <VideoModule 
          title={currentTraining.title}
          description={currentTraining.description}
          date={currentTraining.date}
          progress={((progress?.videoCompleted ? 1 : 0) + (progress?.worksheetCompleted ? 1 : 0)) * 50}
          videoWatched={progress?.videoCompleted || false}
          worksheetCompleted={progress?.worksheetCompleted || false}
          onWatch={() => handleVideoClick(currentTraining)}
          onReview={() => handleOpenWorksheet(currentTraining)}
          onPrevious={handlePreviousTraining}
          onNext={handleNextTraining}
          thumbnailUrl={currentTraining.featuredImage}
        />
      )}

      {/* Rest of content with padding */}
      <div className="p-8">
        {/* Three Column Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Welcome Card */}
          <Card className="bg-white text-[#333333] shadow-md">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-[#333333]">Welcome Back!</CardTitle>
              <p className="text-muted-foreground">
                Where will your growth take you today?
              </p>
            </CardHeader>
          </Card>

          {/* Bold Actions Card with Year-to-Date Progress */}
          <Card className="bg-white text-[#333333] shadow-md flex flex-col">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-[#333333]">Bold Actions</CardTitle>
              {/* Year-to-Date Progress */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Year-to-Date Progress</span>
                  <span className="font-medium">{completedBoldActionsYTD} Completed</span>
                </div>
                <Progress value={completedBoldActionsYTD * 10} className="h-2" />
              </div>
            </CardHeader>
            {boldActions.filter(action => action.status === 'active').length > 3 && (
              <div className="px-4 sm:px-6 py-2 text-red-700">
                You have more than three active bold actions, take a moment and review them.
              </div>
            )}
            <CardContent className="flex-grow p-4 sm:p-6">
              <ScrollArea className="h-[300px]">
                {isBoldActionsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : boldActions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Active Bold Actions */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Current</h3>
                      <ul className="space-y-4">
                        {boldActions
                          .filter(action => action.status === 'active')
                          .map((action) => (
                            <li key={action.id} className="flex items-center justify-between space-x-2 py-2">
                              <div className="flex-grow">
                                <p className="font-medium text-base text-[#333333]">{action.action}</p>
                                <p className="text-sm text-[#666666]">
                                  Due: {action.timeframe}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBoldActionToView({
                                    ...action,
                                    completedAt: action.completedAt || null,
                                    createdAt: action.createdAt || null
                                  })
                                }}
                              >
                                View
                              </Button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No bold actions found
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Leaderboard Card */}
          <Card className="bg-white text-[#333333] shadow-md">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-[#333333]">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {loading ? (
                    Array(3).fill(0).map((_, index) => (
                      <div key={index} className="flex items-center justify-between animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                          <div className="w-24 h-4 bg-gray-300 rounded"></div>
                        </div>
                        <div className="w-16 h-4 bg-gray-300 rounded"></div>
                      </div>
                    ))
                  ) : leaderboard.length > 0 ? (
                    leaderboard.map((leader, index) => (
                      <div key={leader.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6">
                            {index === 0 && <Trophy className="h-5 w-5 text-[#FFC857]" />}
                            {index === 1 && <Star className="h-5 w-5 text-[#C0C0C0]" />}
                            {index === 2 && <Star className="h-5 w-5 text-[#CD7F32]" />}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={leader.avatar} alt={leader.name} />
                            <AvatarFallback>{leader.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-base text-[#333333]">{leader.name}</span>
                        </div>
                        <span className="font-semibold text-base text-[#333333]">{leader.score} Bold Actions</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No bold actions completed yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          url={selectedVideo.url}
          title={selectedVideo.title}
          isCompleted={userProgress[selectedVideo.id]?.videoCompleted || false}
          onMarkAsWatched={() => handleVideoComplete()}
        />
      )}
      <WorksheetModal
        isOpen={isWorksheetModalOpen}
        onClose={() => {
          setIsWorksheetModalOpen(false)
          setSelectedTraining(null)
        }}
        worksheetId={selectedTraining?.id}
        onSubmit={handleWorksheetSubmit}
      />
      <BoldActionModal
        isOpen={isBoldActionModalOpen}
        onClose={() => {
          setIsBoldActionModalOpen(false)
          setBoldActionToView(null)
        }}
        boldAction={boldActionToView}
        onComplete={handleBoldActionComplete}
      />
      <AdminDebugMenu />
    </div>
  )
}

