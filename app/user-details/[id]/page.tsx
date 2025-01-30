'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Clock, Video, FileText, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc as firestoreDoc, getDoc, updateDoc, arrayUnion, Timestamp, collection, query, where, getDocs, orderBy, limit, writeBatch, deleteField, serverTimestamp } from 'firebase/firestore'
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from 'date-fns'

interface UserKPIs {
  currentBoldAction: string | null
  lastCompletedBoldAction: string | null
  currentTraining: string | null
  lastCompletedTraining: string | null
  completedTrainings: number
  completedWorksheets: number
  activeBoldActions: number
  completedBoldActions: number
  overallProgress: number
}

interface Worksheet {
  id: string
  trainingTitle: string
  completionDate: Date
  answers: Record<string, string>
  bigIdea?: string
  boldAction?: string
  completed?: boolean
  futureIdeas?: string[]
  insights?: string[]
  timeframe?: string
  userId?: string
}

interface BoldAction {
  id: string
  action: string
  status: 'active' | 'completed'
  createdAt: Date
  timeframe: string
}

interface Training {
  id: string
  title: string
  videoCompleted: boolean
  worksheetCompleted: boolean
  trainingDate: Date
}

interface StandupNote {
  id: string
  notes: string
  date: Timestamp
  supervisorId: string
  supervisorName: string
}

function formatDate(date: Date | Timestamp | { seconds: number, nanoseconds: number } | any) {
  if (!date) return '';
  
  try {
    // If it's a Firestore Timestamp
    if (date instanceof Timestamp || (date?.toDate && typeof date.toDate === 'function')) {
      return format(date.toDate(), 'MMM d, yyyy h:mm a');
    }
    // If it's a regular Date object
    else if (date instanceof Date) {
      return format(date, 'MMM d, yyyy h:mm a');
    }
    // If it's a timestamp-like object with seconds
    else if (date?.seconds) {
      return format(new Date(date.seconds * 1000), 'MMM d, yyyy h:mm a');
    }
    // Fallback: try to create a new Date
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [kpis, setKPIs] = useState<UserKPIs | null>(null)
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [boldActions, setBoldActions] = useState<BoldAction[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [currentWorksheetIndex, setCurrentWorksheetIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user: currentUser, userRole: currentUserRole } = useAuth()
  const router = useRouter()
  const [standupNotes, setStandupNotes] = useState<StandupNote[]>([])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser?.uid || !params.id || !currentUserRole) {
        console.log('Waiting for auth initialization...', { currentUser, params, currentUserRole })
        return
      }
      
      setLoading(true)
      
      try {
        // Check if user has permission to view details
        if (currentUserRole !== 'executive' && currentUserRole !== 'supervisor' && currentUser.uid !== params.id) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this user's details.",
            variant: "destructive",
          })
          router.push('/')
          return
        }

        // Fetch user document
        const userRef = firestoreDoc(db, 'users', params.id)
        const userDoc = await getDoc(userRef)
        
        if (!userDoc.exists()) {
          console.error('User not found')
          toast({
            title: "Error",
            description: "User not found.",
            variant: "destructive",
          })
          router.push(currentUserRole === 'executive' ? '/executive' : 
                     currentUserRole === 'supervisor' ? '/supervisor' : '/')
          return
        }
        
        const userData = userDoc.data()
        console.log('User data fetched:', { 
          id: userDoc.id, 
          role: userData.role,
          supervisorId: userData.supervisorId 
        })
        setUser({ 
          id: userDoc.id, 
          ...userData,
          supervisorId: userData.supervisorId || null 
        })

        // Get standup notes from user document
        try {
          console.log('Fetching standup notes from user document')
          const standupNotesData = userData.standupNotes || []
          
          if (!standupNotesData.length) {
            console.log('No standup notes found in user document')
            setStandupNotes([])
          } else {
            const formattedNotes = standupNotesData.map(note => ({
              id: note.id || '',
              notes: note.notes || '',
              date: note.date instanceof Timestamp ? note.date.toDate() : new Date(note.date),
              supervisorId: note.supervisorId || '',
              supervisorName: note.supervisorName || ''
            })).sort((a, b) => b.date.getTime() - a.date.getTime())

            console.log(`Found ${formattedNotes.length} standup notes in user document`)
            setStandupNotes(formattedNotes)
          }
        } catch (error) {
          console.error('Error processing standup notes:', error)
          setStandupNotes([])
          toast({
            title: "Warning",
            description: "Unable to load standup notes. Please try again.",
            variant: "destructive",
          })
        }
        
        // Fetch bold actions
        const boldActionsRef = collection(db, `users/${params.id}/boldActions`)
        const boldActionsQuery = query(
          boldActionsRef,
          orderBy('createdAt', 'desc')
        )
        const boldActionsSnapshot = await getDocs(boldActionsQuery)
        const boldActionsData = boldActionsSnapshot.docs.map(doc => {
          const data = doc.data()
          let createdAtDate: Date;
          
          // Handle different date formats
          if (data.createdAt?.toDate) {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt?.seconds) {
            createdAtDate = new Date(data.createdAt.seconds * 1000);
          } else if (data.createdAt) {
            createdAtDate = new Date(data.createdAt);
          } else {
            createdAtDate = new Date();
          }

          return {
            id: doc.id,
            action: data.action || '',
            status: data.status || 'active',
            createdAt: createdAtDate,
            timeframe: data.timeframe || ''
          } satisfies BoldAction
        })
        setBoldActions(boldActionsData)
        
        // Set KPIs based on bold actions and user data
        const activeBoldActions = boldActionsData.filter(ba => ba.status === 'active')
        const completedBoldActions = boldActionsData.filter(ba => ba.status === 'completed')
        
        // Fetch trainings
        const progressRef = firestoreDoc(db, `users/${params.id}/progress/trainings`)
        const progressDoc = await getDoc(progressRef)
        const progressData = progressDoc.exists() ? progressDoc.data() : {}
        
        // Get all training IDs from progress data
        const trainingIds = Object.keys(progressData)
        
        // Fetch training titles from trainings collection
        const trainingsData = await Promise.all(
          trainingIds.map(async (trainingId) => {
            const progress = progressData[trainingId] || {}
            try {
              const trainingDoc = await getDoc(firestoreDoc(db, 'trainings', trainingId))
              const trainingDate = progress.lastUpdated 
                ? (progress.lastUpdated instanceof Timestamp 
                  ? progress.lastUpdated.toDate() 
                  : progress.lastUpdated?.seconds 
                    ? new Date(progress.lastUpdated.seconds * 1000)
                    : new Date(progress.lastUpdated))
                : null;

              return {
                id: trainingId,
                title: trainingDoc.exists() ? trainingDoc.data()?.title : trainingId,
                videoCompleted: progress.videoCompleted || false,
                worksheetCompleted: progress.worksheetCompleted || false,
                trainingDate: trainingDate
              }
            } catch (error) {
              console.error('Error fetching training:', error)
              // Fallback if fetch fails
              return {
                id: trainingId,
                title: trainingId,
                videoCompleted: progress.videoCompleted || false,
                worksheetCompleted: progress.worksheetCompleted || false,
                trainingDate: null
              }
            }
          })
        )
        setTrainings(trainingsData)
        
        // Calculate completed trainings from trainingsData
        const completedTrainingsCount = trainingsData.filter(t => t.videoCompleted).length

        setKPIs({
          currentBoldAction: activeBoldActions[0]?.action || null,
          lastCompletedBoldAction: completedBoldActions[0]?.action || null,
          currentTraining: userData.currentTraining || null,
          lastCompletedTraining: userData.lastCompletedTraining || null,
          completedTrainings: completedTrainingsCount,
          completedWorksheets: userData.completedWorksheets || 0,
          activeBoldActions: activeBoldActions.length,
          completedBoldActions: completedBoldActions.length,
          overallProgress: userData.overallProgress || 0
        })
        
        // Fetch worksheets from user's worksheets subcollection
        try {
          console.log('Fetching worksheets for user:', params.id)
          const worksheetsRef = collection(db, 'users', params.id, 'worksheets')
          const worksheetsQuery = query(
            worksheetsRef,
            orderBy('completedAt', 'desc')
          )
          
          const worksheetsSnapshot = await getDocs(worksheetsQuery)
          console.log('Worksheets query result:', {
            empty: worksheetsSnapshot.empty,
            size: worksheetsSnapshot.size
          })
          
          if (worksheetsSnapshot.empty) {
            console.log('No worksheets found')
            setWorksheets([])
          } else {
            const worksheetsData = await Promise.all(
              worksheetsSnapshot.docs.map(async (doc) => {
                const data = doc.data()
                console.log('Processing worksheet:', {
                  id: doc.id,
                  path: doc.ref.path,
                  data: {
                    trainingId: data.trainingId,
                    completedAt: data.completedAt,
                    bigIdea: data.bigIdea,
                    boldAction: data.boldAction,
                    completed: data.completed,
                    futureIdeas: data.futureIdeas,
                    insights: data.insights,
                    timeframe: data.timeframe,
                    userId: data.userId,
                    hasAnswers: !!data.answers
                  }
                })

                // Default values in case of missing data
                const worksheetData: Worksheet = {
                  id: doc.id,
                  trainingTitle: 'Unknown Training',
                  completionDate: data.completedAt instanceof Timestamp 
                    ? data.completedAt.toDate() 
                    : new Date(),
                  answers: data.answers || {},
                  bigIdea: data.bigIdea || '',
                  boldAction: data.boldAction || '',
                  completed: data.completed || false,
                  futureIdeas: data.futureIdeas || [],
                  insights: data.insights || [],
                  timeframe: data.timeframe || '',
                  userId: data.userId || ''
                }

                try {
                  if (data.trainingId) {
                    const trainingRef = firestoreDoc(db, 'trainings', data.trainingId)
                    const trainingDoc = await getDoc(trainingRef)
                    if (trainingDoc.exists()) {
                      const trainingData = trainingDoc.data() as { title?: string }
                      worksheetData.trainingTitle = trainingData?.title || 'Unknown Training'
                    }
                  }
                  return worksheetData
                } catch (error) {
                  console.error('Error fetching training details for worksheet:', worksheetData.id, error)
                  return worksheetData
                }
              })
            )
            console.log(`Successfully processed ${worksheetsData.length} worksheets`)
            setWorksheets(worksheetsData)
          }
        } catch (error) {
          console.error('Error fetching worksheets:', error)
          setWorksheets([])
          toast({
            title: "Warning",
            description: "Unable to load worksheets. Please try again.",
            variant: "destructive",
          })
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching user data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch user data. Please try again.",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchUserData()
  }, [currentUser, params.id, currentUserRole, router, toast])

  const handlePrevWorksheet = () => {
    setCurrentWorksheetIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const handleNextWorksheet = () => {
    setCurrentWorksheetIndex((prev) => (prev < worksheets.length - 1 ? prev + 1 : prev))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !kpis) {
    return <div className="flex justify-center items-center h-screen">User not found</div>
  }

  const isTeamMember = user.role === 'team_member'
  const isSupervisor = user.role === 'supervisor'
  const isExecutive = user.role === 'executive'

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button 
          onClick={() => router.push(currentUserRole === 'executive' ? '/executive' : '/supervisor')} 
          variant="outline"
          className="mb-6"
        >
          Back to {currentUserRole === 'executive' ? 'Executive Dashboard' : 'My Team'}
        </Button>
        
        {user?.role === 'team_member' && user?.supervisorId && (
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('Navigating to supervisor:', user.supervisorId)
              router.push(`/user-details/${user.supervisorId}`)
            }}
          >
            View Supervisor
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-black">{user?.firstName} {user?.lastName}</h1>
        <p className="text-lg text-gray-600">{user?.email}</p>
        <p className="text-sm text-gray-500">Role: {user?.role}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-black">Current Status</CardTitle>
              {kpis?.activeBoldActions > 0 ? (
                <Clock className="h-5 w-5 text-yellow-500" />
              ) : kpis?.overallProgress >= 90 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Bold Actions</p>
                <div className="text-2xl font-bold text-black">{kpis?.activeBoldActions}</div>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Trainings</p>
                <div className="text-2xl font-bold text-black">{kpis?.completedTrainings}</div>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                {kpis?.activeBoldActions > 0
                  ? `${user?.firstName} has ${kpis?.activeBoldActions} active Bold Action${kpis?.activeBoldActions > 1 ? 's' : ''}. Follow up to ensure progress.`
                  : kpis?.overallProgress >= 90
                  ? `${user?.firstName} is making excellent progress. Consider setting more challenging goals.`
                  : `${user?.firstName} may need additional support or motivation. Schedule a check-in.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Worksheet Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Completed</p>
                  <div className="text-2xl font-bold text-black">{kpis?.completedWorksheets}</div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Success Rate</p>
                  <div className="text-2xl font-bold text-black">
                    {kpis?.completedWorksheets > 0
                      ? `${((kpis?.completedWorksheets / (kpis?.completedWorksheets + worksheets.length)) * 100).toFixed(0)}%`
                      : '0%'}
                  </div>
                </div>
              </div>
              <Progress 
                value={kpis?.completedWorksheets > 0
                  ? (kpis?.completedWorksheets / (kpis?.completedWorksheets + worksheets.length)) * 100
                  : 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="actions" className="text-gray-700">Bold Actions</TabsTrigger>
          <TabsTrigger value="training" className="text-gray-700">Training Progress</TabsTrigger>
          <TabsTrigger value="worksheets" className="text-gray-700">Worksheet Answers</TabsTrigger>
          <TabsTrigger value="standups" className="text-gray-700">Standup Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-700">Action</TableHead>
                    <TableHead className="text-gray-700">Status</TableHead>
                    <TableHead className="text-gray-700">Timeframe</TableHead>
                    <TableHead className="text-gray-700">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boldActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium text-black">{action.action}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {action.status === 'completed' ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-gray-600">Completed</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm text-gray-600">Active</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{action.timeframe}</TableCell>
                      <TableCell className="text-gray-600">{action.createdAt.toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-700">Training</TableHead>
                    <TableHead className="text-gray-700">Video</TableHead>
                    <TableHead className="text-gray-700">Worksheet</TableHead>
                    <TableHead className="text-gray-700">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell className="font-medium text-black">{training.title}</TableCell>
                      <TableCell>
                        {training.videoCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Video className="h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {training.worksheetCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {training.trainingDate ? 
                          formatDate(training.trainingDate)
                          : 'Not completed'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worksheets">
          <Card className="bg-white">
            <CardContent className="pt-6">
              {worksheets.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <Button onClick={handlePrevWorksheet} disabled={currentWorksheetIndex === 0}>
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-black">
                      {worksheets[currentWorksheetIndex].trainingTitle}
                      <span className="text-gray-500 ml-2">
                        ({formatDate(worksheets[currentWorksheetIndex].completionDate)})
                      </span>
                    </span>
                    <Button onClick={handleNextWorksheet} disabled={currentWorksheetIndex === worksheets.length - 1}>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {worksheets[currentWorksheetIndex].bigIdea && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Big Idea</Label>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {worksheets[currentWorksheetIndex].bigIdea}
                        </p>
                      </div>
                    )}
                    {worksheets[currentWorksheetIndex].boldAction && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Bold Action</Label>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {worksheets[currentWorksheetIndex].boldAction}
                        </p>
                      </div>
                    )}
                    {worksheets[currentWorksheetIndex].futureIdeas?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Future Ideas</Label>
                        <ul className="list-disc pl-4">
                          {worksheets[currentWorksheetIndex].futureIdeas.map((idea, idx) => (
                            <li key={idx} className="text-sm text-gray-600">{idea}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {worksheets[currentWorksheetIndex].insights?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Insights</Label>
                        <ul className="list-disc pl-4">
                          {worksheets[currentWorksheetIndex].insights.map((insight, idx) => (
                            <li key={idx} className="text-sm text-gray-600">{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {worksheets[currentWorksheetIndex].timeframe && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Timeframe</Label>
                        <p className="text-sm text-gray-600">
                          {worksheets[currentWorksheetIndex].timeframe}
                        </p>
                      </div>
                    )}
                    {Object.entries(worksheets[currentWorksheetIndex].answers).map(([question, answer], index) => (
                      <div key={index} className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">{question}</Label>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500">No worksheets completed yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standups">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-black">Standup Notes History</CardTitle>
              <CardDescription className="text-gray-600">
                Record of all standup meetings with this team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {standupNotes.length > 0 ? (
                  standupNotes.map((note, index) => (
                    <div 
                      key={index} 
                      className={`bg-white rounded-lg p-4 space-y-2 border border-gray-200 ${
                        index < 4 ? 'animate-fadeIn' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <p className="text-sm text-gray-600">{format(note.date, 'MMM d, yyyy')}</p>
                        </div>
                        <p className="text-sm text-gray-600">{note.supervisorName}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-gray-700 whitespace-pre-wrap">{note.notes}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No standup notes available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

