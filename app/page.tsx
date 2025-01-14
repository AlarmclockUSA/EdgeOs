'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Star, Video, ClipboardCheck, CheckCircle, Info, PlusIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CourseModal } from '@/components/course-modal'
import { WorksheetModal } from '@/components/worksheet-modal'
import { BoldActionModal } from '@/components/bold-action-modal'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, increment } from 'firebase/firestore'
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import Link from 'next/link'
import { AdminDebugMenu } from '@/components/admin-debug-menu'
import { FirebaseError } from 'firebase/app'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StyledCard } from '@/components/StyledCard'

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
  const [boldActions, setBoldActions] = useState<Array<{id: string, action: string, timeframe: string, completedAt: Date | {toDate: () => Date}}>>([])
  const [completedBoldActions, setCompletedBoldActions] = useState(0)
  const [completedBoldActionsYTD, setCompletedBoldActionsYTD] = useState(0)
  const [boldActionToView, setBoldActionToView] = useState(null);
  const [isBoldActionsLoading, setIsBoldActionsLoading] = useState(false);
  const [companyProgress, setCompanyProgress] = useState({
    totalUsers: 0,
    totalCompletedBoldActions: 0,
    remainingActions: 0
  });
  const [leaderboard, setLeaderboard] = useState<Array<{ name: string; score: number; avatar: string }>>([]);
  const [nextTrainingDate, setNextTrainingDate] = useState<string | null>(null)
  const [selectedTraining, setSelectedTraining] = useState<any>(null)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({})
  const [currentTrainingIndex, setCurrentTrainingIndex] = useState(0)

  const fetchBoldActions = async () => {
    if (user) {
      setIsBoldActionsLoading(true);
      try {
        console.log("Fetching bold actions for user:", user.uid);
        const boldActionsRef = collection(db, 'boldActions')
        const q = query(
          boldActionsRef,
          where('userId', '==', user.uid),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        )
        const querySnapshot = await getDocs(q)
        const actions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          action: doc.data().action,
          timeframe: doc.data().timeframe,
          completedAt: doc.data().createdAt
        }))
        console.log("Fetched bold actions:", actions);
        setBoldActions(actions)
      } catch (error) {
        console.error('Error fetching bold actions:', error)
        if (error instanceof FirebaseError) {
          console.error("Firebase error code:", error.code);
          console.error("Firebase error message:", error.message);
        }
        toast({
          title: "Error",
          description: "Failed to fetch bold actions. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsBoldActionsLoading(false);
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
    }
  }, [user, loading, router])

  const fetchTrainings = async () => {
    if (!user) return

    try {
      const trainingsRef = collection(db, 'trainings')
      const q = query(trainingsRef, orderBy('trainingDate', 'asc'))
      const querySnapshot = await getDocs(q)
      const fetchedTrainings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        trainingDate: doc.data().trainingDate?.toDate() || new Date(),
      })) as Training[]

      setTrainings(fetchedTrainings)

      // Fetch user progress for each training
      const progressPromises = fetchedTrainings.map(async (training) => {
        const progressRef = doc(db, 'userProgress', `${user.uid}_${training.id}`)
        const progressDoc = await getDoc(progressRef)
        return {
          [training.id]: progressDoc.exists() ? progressDoc.data() as UserProgress : { videoCompleted: false, worksheetCompleted: false }
        }
      })

      const progressResults = await Promise.all(progressPromises)
      const combinedProgress = Object.assign({}, ...progressResults)
      setUserProgress(combinedProgress)
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

  const handleOpenVideo = (training: Training) => {
    setSelectedTraining(training)
    setIsTrainingModalOpen(true)
  }

  const handleOpenWorksheet = (training: Training) => {
    setSelectedTraining(training)
    setIsWorksheetModalOpen(true)
  }

  const handleVideoComplete = useCallback(async () => {
    if (user && selectedTraining) {
      try {
        const progressRef = doc(db, 'userProgress', `${user.uid}_${selectedTraining.id}`)
        await updateDoc(progressRef, {
          videoCompleted: true,
          videoCompletionDate: new Date()
        })

        // Update user's completed trainings count
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          completedTrainings: increment(1)
        })

        setUserProgress(prev => ({
          ...prev,
          [selectedTraining.id]: {
            ...prev[selectedTraining.id],
            videoCompleted: true
          }
        }))

        toast({
          title: "Video Completed",
          description: "You've successfully completed the training video.",
        })
      } catch (error) {
        console.error("Error updating video completion status:", error)
        toast({
          title: "Error",
          description: "Failed to update video completion status. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [user, selectedTraining])

  const handleWorksheetSubmit = useCallback(async (newBoldActionId: string) => {
    if (user && selectedTraining) {
      try {
        const progressRef = doc(db, 'userProgress', `${user.uid}_${selectedTraining.id}`)
        await updateDoc(progressRef, {
          worksheetCompleted: true,
          worksheetCompletionDate: new Date()
        })

        // Update user's completed worksheets count
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          completedWorksheets: increment(1)
        })

        setUserProgress(prev => ({
          ...prev,
          [selectedTraining.id]: {
            ...prev[selectedTraining.id],
            worksheetCompleted: true
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

  const fetchCompletedBoldActions = async () => {
    if (user) {
      try {
        console.log("Fetching completed bold actions for user:", user.uid);
        const boldActionsRef = collection(db, 'boldActions')
        const q = query(
          boldActionsRef,
          where('userId', '==', user.uid),
          where('status', '==', 'completed')
        )
        
        const querySnapshot = await getDocs(q)
        const currentYear = new Date().getFullYear()
        let sumCompletedThisYear = 0
        querySnapshot.docs.forEach(doc => {
          const completedAt = doc.data().completedAt?.toDate()
          if (completedAt && completedAt.getFullYear() === currentYear) {
            sumCompletedThisYear++
          }
        })
        console.log("Sum of completed bold actions this year:", sumCompletedThisYear);
        setCompletedBoldActionsYTD(sumCompletedThisYear)
      } catch (error) {
        console.error('Error fetching completed bold actions:', error)
        if (error instanceof FirebaseError) {
          console.error("Firebase error code:", error.code);
          console.error("Firebase error message:", error.message);
        }
        toast({
          title: "Error",
          description: "Failed to fetch completed bold actions. Please try again later.",
          variant: "destructive",
        })
        // Set default value in case of error
        setCompletedBoldActionsYTD(0)
      }
    }
  }

  useEffect(() => {
    fetchCompletedBoldActions()
  }, [user]);

  const fetchCompanyProgress = useCallback(async () => {
    if (!companyName) {
      console.error('Company name is not available');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('companyName', '==', companyName));
      const querySnapshot = await getDocs(q);

      let totalUsers = 0;
      let totalCompletedBoldActions = 0;

      querySnapshot.forEach((doc) => {
        totalUsers++;
        totalCompletedBoldActions += doc.data().completedBoldActions || 0;
      });

      const totalPossibleActions = totalUsers * 48;
      const remainingActions = totalPossibleActions - totalCompletedBoldActions;

      setCompanyProgress({
        totalUsers,
        totalCompletedBoldActions,
        remainingActions
      });
    } catch (error) {
      console.error('Error fetching company progress:', error);
      toast({
        title: "Error",
        description: "Failed to fetch company progress. Please try again later.",
        variant: "destructive",
      });
    }
  }, [companyName]);

  useEffect(() => {
    if (companyName) {
      fetchCompanyProgress();
    }
  }, [companyName, fetchCompanyProgress]);

  const fetchLeaderboard = async () => {
    if (!companyName) {
      console.log('Company name is not available. Skipping leaderboard fetch.');
      setLeaderboard([]);
      return;
    }
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('companyName', '==', companyName), orderBy('completedBoldActions', 'desc'), limit(3));
      const querySnapshot = await getDocs(q);
      
      const leaderboardData = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            name: `${data.firstName} ${data.lastName}`,
            score: data.completedBoldActions || 0,
            avatar: data.avatar || '/placeholder.svg?height=32&width=32'
          };
        })
        .filter(user => user.score > 0);
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (error instanceof FirebaseError) {
        if (error.code === 'failed-precondition') {
          console.log('This error might be due to missing composite index. Check Firestore indexes.');
          setLeaderboard([]);
          toast({
            title: "Leaderboard Unavailable",
            description: "We're setting up the leaderboard. Please check back later.",
            variant: "warning",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch leaderboard data. Please try again later.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (companyName) {
      fetchLeaderboard();
    }
  }, [companyName]);

  const handleBoldActionComplete = useCallback(async (actionId: string) => {
    if (user) {
      setIsBoldActionsLoading(true);
      try {
        // Update the bold action status in Firestore
        const boldActionRef = doc(db, 'boldActions', actionId);
        await updateDoc(boldActionRef, {
          status: 'completed',
          completedAt: new Date()
        });

        // Increment the completed bold actions count
        setCompletedBoldActions((prev) => prev + 1)

        // Update the user document in Firestore
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          completedBoldActions: increment(1)
        })

        // Fetch updated bold actions
        await fetchBoldActions();

        // Update company progress
        await fetchCompanyProgress();

        toast({
          title: "Bold Action Completed",
          description: "Your bold action has been marked as completed.",
        })
      } catch (error) {
        console.error('Error completing bold action:', error)
        toast({
          title: "Error",
          description: "Failed to complete bold action. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsBoldActionsLoading(false);
      }
    }
  }, [user, fetchBoldActions, fetchCompanyProgress]);

  useEffect(() => {
    fetchBoldActions()
  }, [user]);

  if (!user) {
    return null
  }

  const currentTraining = trainings[currentTrainingIndex]
  const progress = currentTraining ? userProgress[currentTraining.id] || { videoCompleted: false, worksheetCompleted: false } : null

  return (
    <div className="container mx-auto p-6 space-y-8 text-[#333333]">
      <h1 className="text-4xl font-bold mb-6 text-[#333333]">My Learning Dashboard</h1>
    
      {/* Training Card */}
      <StyledCard title="Current Training">
        <CardContent className="bg-white text-[#333333]">
          {currentTraining ? (
            <>
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-[#333333] mb-2">{currentTraining.title}</h3>
                <p className="text-sm text-[#666666] mb-4">{currentTraining.description}</p>
              </div>
              <div className="h-2 mb-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(to right, #1EB6A6, #FFC857)',
                    width: `${(progress?.videoCompleted ? 50 : 0) + (progress?.worksheetCompleted ? 50 : 0)}%`,
                    transition: 'width 0.5s ease-in-out',
                  }}
                />
              </div>
              <div className="flex justify-between text-sm text-[#666666] mb-4">
                <span>Progress</span>
                <span>{progress?.videoCompleted && progress?.worksheetCompleted ? '100%' : progress?.videoCompleted || progress?.worksheetCompleted ? '50%' : '0%'}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Video className={`mr-2 h-4 w-4 ${progress?.videoCompleted ? 'text-[#1EB6A6]' : 'text-[#FFC857]'}`} />
                    <span className="text-sm">{progress?.videoCompleted ? 'Video Completed' : 'Video Not Watched'}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenVideo(currentTraining)}
                    className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                  >
                    {progress?.videoCompleted ? 'Rewatch' : 'Watch'} Video
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClipboardCheck className={`mr-2 h-4 w-4 ${progress?.worksheetCompleted ? 'text-[#1EB6A6]' : 'text-[#FFC857]'}`} />
                    <span className="text-sm">{progress?.worksheetCompleted ? 'Worksheet Completed' : 'Worksheet Not Submitted'}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenWorksheet(currentTraining)}
                    className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                  >
                    {progress?.worksheetCompleted ? 'Review' : 'Complete'} Worksheet
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Button onClick={handlePreviousTraining} disabled={currentTrainingIndex === 0} variant="outline" size="icon" className="text-[#0056D2] hover:bg-[#EAF4FE] hover:text-[#0056D2]">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button onClick={handleNextTraining} disabled={currentTrainingIndex === trainings.length - 1} variant="outline" size="icon" className="text-[#0056D2] hover:bg-[#EAF4FE] hover:text-[#0056D2]">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-[#666666]">No training available at the moment.</p>
          )}
        </CardContent>
      </StyledCard>

      {/* Bold Actions and Year-to-Date Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Bold Actions Card */}
        <Card className="bg-white text-[#333333] shadow-md flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-[#333333]">Current Bold Actions</CardTitle>
          </CardHeader>
          {boldActions.length > 3 && (
            <div className="px-6 py-2 text-red-700">
              You have more than three active bold actions, take a moment and review them.
            </div>
          )}
          <CardContent className="flex-grow">
            {boldActions.length > 3 ? (
              <ScrollArea className="h-full">
                {isBoldActionsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : boldActions.length > 0 ? (
                  <ul className="space-y-4">
                    {boldActions.map((action) => (
                      <li key={action.id} className="flex items-center justify-between space-x-2 py-2">
                        <div className="flex-grow">
                          <p className="font-medium text-base text-[#333333]">{action.action}</p>
                          <p className="text-sm text-[#666666]">Timeframe: {action.timeframe}</p>
                        </div>
                        <p className="text-sm text-[#666666] whitespace-nowrap">
                          {action.completedAt instanceof Date 
                            ? action.completedAt.toLocaleDateString()
                            : action.completedAt && 'toDate' in action.completedAt
                              ? action.completedAt.toDate().toLocaleDateString()
                              : 'Date not available'}
                        </p>
                        <Button
                          className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsBoldActionModalOpen(true);
                            setBoldActionToView(action);
                          }}
                        >
                          <Info className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#666666]">No active Bold Actions found. Complete a worksheet to set a new Bold Action.</p>
                )}
              </ScrollArea>
            ) : (
              <>
                {isBoldActionsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : boldActions.length > 0 ? (
                  <ul className="space-y-4">
                    {boldActions.map((action) => (
                      <li key={action.id} className="flex items-center justify-between space-x-2 py-2">
                        <div className="flex-grow">
                          <p className="font-medium text-base text-[#333333]">{action.action}</p>
                          <p className="text-sm text-[#666666]">Timeframe: {action.timeframe}</p>
                        </div>
                        <p className="text-sm text-[#666666] whitespace-nowrap">
                          {action.completedAt instanceof Date 
                            ? action.completedAt.toLocaleDateString()
                            : action.completedAt && 'toDate' in action.completedAt
                              ? action.completedAt.toDate().toLocaleDateString()
                              : 'Date not available'}
                        </p>
                        <Button
                          className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsBoldActionModalOpen(true);
                            setBoldActionToView(action);
                          }}
                        >
                          <Info className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#666666]">No active Bold Actions found. Complete a worksheet to set a new Bold Action.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Bold Actions This Year Card */}
        <Card className="bg-white text-[#333333] shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-[#333333]">Bold Actions This Year</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-[#333333]">{completedBoldActionsYTD}</div>
            <p className="text-base text-[#666666]">Total Bold Actions completed this year</p>
            <Progress className="bg-gradient-to-r from-[#1EB6A6] to-[#0056D2]" 
              value={(completedBoldActionsYTD / 48) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Card */}
      <Card className="bg-white text-[#333333] shadow-md relative overflow-hidden">
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-semibold text-[#333333]">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <div className="space-y-4">
            <h3 className="font-semibold text-xl text-[#333333]">Leaderboard</h3>
            <div className="space-y-3">
              {loading ? (
                // Skeleton loader for leaderboard
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
              ) : (
                // Existing leaderboard content
                leaderboard.length > 0 ? (
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
                  <p className="text-sm text-[#666666]">No bold actions completed yet. Be the first to top the leaderboard!</p>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CourseModal
        isOpen={isTrainingModalOpen}
        onClose={() => {
          setIsTrainingModalOpen(false);
          setSelectedTraining(null);
        }}
        course={selectedTraining || {}}
        nextTrainingDate={nextTrainingDate}
        onVideoComplete={handleVideoComplete}
      />
      <WorksheetModal
        isOpen={isWorksheetModalOpen}
        onClose={() => {
          setIsWorksheetModalOpen(false);
          setSelectedTraining(null);
        }}
        worksheetId={selectedTraining?.id}
        onSubmit={handleWorksheetSubmit}
      />
      <BoldActionModal
        isOpen={isBoldActionModalOpen}
        onClose={() => {
          setIsBoldActionModalOpen(false);
          setBoldActionToView(null);
        }}
        boldAction={boldActionToView}
        onComplete={handleBoldActionComplete}
      />
      <AdminDebugMenu />
    </div>
  )
}

