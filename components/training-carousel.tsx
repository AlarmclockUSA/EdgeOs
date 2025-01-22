'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// import { Progress } from "@/components/ui/progress" //Removed as per update
import { ChevronLeft, ChevronRight, Video, FileText } from 'lucide-react'

interface Training {
  id: string
  title: string
  description: string
  videoLink: string
  trainingDate: Date
}

interface UserProgress {
  videoCompleted: boolean
  worksheetCompleted: boolean
}

interface TrainingCarouselProps {
  onOpenVideo: (training: Training) => void
  onOpenWorksheet: (training: Training) => void
}

export function TrainingCarousel({ onOpenVideo, onOpenWorksheet }: TrainingCarouselProps) {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    const fetchTrainings = async () => {
      if (!user) return

      const trainingsRef = collection(db, 'trainings')
      const q = query(trainingsRef, orderBy('trainingDate', 'asc'))
      const querySnapshot = await getDocs(q)
      const fetchedTrainings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        trainingDate: doc.data().trainingDate?.toDate() || new Date(),
      })) as Training[]

      setTrainings(fetchedTrainings)
    }

    fetchTrainings()
  }, [user])

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!user) return
      
      const combinedProgress: Record<string, UserProgress> = {}
      
      // Fetch progress for each training
      for (const training of trainings) {
        try {
          const progressRef = doc(db, `users/${user.uid}/progress/${training.id}`)
          const progressDoc = await getDoc(progressRef)
          combinedProgress[training.id] = progressDoc.exists() 
            ? progressDoc.data() as UserProgress 
            : { videoCompleted: false, worksheetCompleted: false }
        } catch (error) {
          console.error(`Error fetching progress for training ${training.id}:`, error)
          combinedProgress[training.id] = { videoCompleted: false, worksheetCompleted: false }
        }
      }
      
      setUserProgress(combinedProgress)
    }

    if (trainings.length > 0) {
      fetchUserProgress()
    }
  }, [user, trainings])

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex))
  }

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < trainings.length - 1 ? prevIndex + 1 : prevIndex))
  }

  if (trainings.length === 0) {
    return <div>Loading trainings...</div>
  }

  const currentTraining = trainings[currentIndex]
  const progress = userProgress[currentTraining.id] || { videoCompleted: false, worksheetCompleted: false }

  return (
    <Card className="border-none">
      <CardContent className="bg-white text-[#333333]">
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-[#333333] mb-2">{currentTraining.title}</h3>
          <p className="text-sm text-[#666666] mb-4">{currentTraining.description}</p>
        </div>
        <div className="h-2 mb-4 bg-gray-200 rounded-full overflow-hidden"> {/*Replaced Progress component*/}
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(to right, #1EB6A6, #FFC857)',
              width: `${(progress.videoCompleted ? 50 : 0) + (progress.worksheetCompleted ? 50 : 0)}%`,
              transition: 'width 0.5s ease-in-out',
            }}
          />
        </div>
        <div className="flex justify-between text-sm text-[#666666] mb-4">
          <span>Progress</span>
          <span>{progress.videoCompleted && progress.worksheetCompleted ? '100%' : progress.videoCompleted || progress.worksheetCompleted ? '50%' : '0%'}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Video className={`mr-2 h-4 w-4 ${progress.videoCompleted ? 'text-[#1EB6A6]' : 'text-[#FFC857]'}`} />
              <span className="text-sm">{progress.videoCompleted ? 'Video Completed' : 'Video Not Watched'}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenVideo(currentTraining)}
              className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
            >
              {progress.videoCompleted ? 'Rewatch' : 'Watch'} Video
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className={`mr-2 h-4 w-4 ${progress.worksheetCompleted ? 'text-[#1EB6A6]' : 'text-[#FFC857]'}`} />
              <span className="text-sm">{progress.worksheetCompleted ? 'Worksheet Completed' : 'Worksheet Not Submitted'}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenWorksheet(currentTraining)}
              className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
            >
              {progress.worksheetCompleted ? 'Review' : 'Complete'} Worksheet
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline" size="icon" className="text-[#0056D2] hover:bg-[#EAF4FE] hover:text-[#0056D2]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={handleNext} disabled={currentIndex === trainings.length - 1} variant="outline" size="icon" className="text-[#0056D2] hover:bg-[#EAF4FE] hover:text-[#0056D2]">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

