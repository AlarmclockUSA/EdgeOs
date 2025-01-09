'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, getDocs, orderBy, where, doc, setDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { CourseModal } from '@/components/course-modal'
import { WorksheetModal } from '@/components/worksheet-modal'
import { Video, FileText, CheckCircle, Clock, Search } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Training {
  id: string
  title: string
  description: string
  videoLink: string
  trainingDate: Date
}

interface UserProgress {
  [trainingId: string]: {
    videoCompleted: boolean
    worksheetCompleted: boolean
  }
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
      const trainingsRef = collection(db, 'trainings')
      const q = query(trainingsRef, orderBy('trainingDate', 'desc'))
      const querySnapshot = await getDocs(q)
      const fetchedTrainings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        trainingDate: doc.data().trainingDate?.toDate() || new Date(),
      })) as Training[]
      setTrainings(fetchedTrainings)
    } catch (error) {
      console.error('Error fetching trainings:', error)
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
      const progressRef = collection(db, 'userProgress')
      const q = query(progressRef, where('userId', '==', user.uid))
      const querySnapshot = await getDocs(q)
      
      const progress: UserProgress = {}
      querySnapshot.forEach(doc => {
        const data = doc.data()
        progress[data.trainingId] = {
          videoCompleted: data.videoCompleted || false,
          worksheetCompleted: data.worksheetCompleted || false
        }
      })
      
      setUserProgress(progress)
    } catch (error) {
      console.error('Error fetching user progress:', error)
      toast({
        title: "Error",
        description: "Failed to fetch your progress. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const sortTrainings = (a: Training, b: Training) => {
    return a.title.localeCompare(b.title);
  };

  const filteredTrainings = trainings
    .filter(training =>
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(sortTrainings);

  const handleVideoComplete = async () => {
    if (selectedTraining && user) {
      try {
        const progressRef = doc(db, 'userProgress', `${user.uid}_${selectedTraining.id}`)
        await setDoc(progressRef, {
          userId: user.uid,
          trainingId: selectedTraining.id,
          videoCompleted: true,
          completionDate: new Date(),
        }, { merge: true })

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
        const progressRef = doc(db, 'userProgress', `${user.uid}_${selectedTraining.id}`)
        await setDoc(progressRef, {
          userId: user.uid,
          trainingId: selectedTraining.id,
          worksheetCompleted: true,
          completionDate: new Date(),
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

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTrainings.map((training) => {
        const progress = userProgress[training.id];
        const completionPercentage = 
          ((progress?.videoCompleted ? 1 : 0) + (progress?.worksheetCompleted ? 1 : 0)) * 50;

        return (
          <Card key={training.id} className="flex flex-col bg-white border-0">
            <div className="w-full aspect-video bg-muted rounded-t-lg" />
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-gray-900">
                <span className="text-xl text-gray-900">{training.title}</span>
                {progress?.videoCompleted && progress?.worksheetCompleted ? (
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
                  <Video className={`mr-2 h-4 w-4 ${progress?.videoCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${progress?.videoCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {progress?.videoCompleted ? 'Video Completed' : 'Video Not Watched'}
                  </span>
                </div>
                <div className="flex items-center">
                  <FileText className={`mr-2 h-4 w-4 ${progress?.worksheetCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${progress?.worksheetCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {progress?.worksheetCompleted ? 'Worksheet Completed' : 'Worksheet Not Submitted'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 w-full">
                <Button
                  className="flex-1"
                  onClick={() => onOpenVideo(training)}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {progress?.videoCompleted ? 'Rewatch' : 'Watch'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenWorksheet(training)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {progress?.worksheetCompleted ? 'Review' : 'Complete'}
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
    </div>
  )
}

