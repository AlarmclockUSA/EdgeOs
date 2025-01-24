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
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface MeetingNote {
  date: Timestamp
  note: string
  boldAction?: string
  expectedTimeframe?: string
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const unwrappedParams = React.use(params)
  const [user, setUser] = useState<any>(null)
  const [kpis, setKPIs] = useState<UserKPIs | null>(null)
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [boldActions, setBoldActions] = useState<BoldAction[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [newBoldAction, setNewBoldAction] = useState('')
  const [newExpectedTimeframe, setNewExpectedTimeframe] = useState<string | undefined>(undefined)
  const [isAddingBoldAction, setIsAddingBoldAction] = useState(false)
  const [currentWorksheetIndex, setCurrentWorksheetIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user: currentUser, userRole: currentUserRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser || !unwrappedParams.id) return
      
      try {
        // Check if user has permission to view details
        if (currentUserRole !== 'executive' && currentUserRole !== 'supervisor' && currentUser.uid !== unwrappedParams.id) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this user's details.",
            variant: "destructive",
          })
          router.push('/')
          return
        }

        // Fetch user document
        const userRef = doc(db, 'users', unwrappedParams.id)
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
        setUser({ id: userDoc.id, ...userData })
        
        // Fetch bold actions
        const boldActionsRef = collection(db, `users/${unwrappedParams.id}/boldActions`)
        const boldActionsQuery = query(
          boldActionsRef,
          orderBy('createdAt', 'desc')
        )
        const boldActionsSnapshot = await getDocs(boldActionsQuery)
        const boldActionsData = boldActionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }))
        setBoldActions(boldActionsData as BoldAction[])
        
        // Set KPIs based on bold actions and user data
        const activeBoldActions = boldActionsData.filter(ba => ba.status === 'active')
        const completedBoldActions = boldActionsData.filter(ba => ba.status === 'completed')
        
        setKPIs({
          currentBoldAction: activeBoldActions[0]?.action || null,
          lastCompletedBoldAction: completedBoldActions[0]?.action || null,
          currentTraining: userData.currentTraining || null,
          lastCompletedTraining: userData.lastCompletedTraining || null,
          completedTrainings: userData.completedTrainings || 0,
          completedWorksheets: userData.completedWorksheets || 0,
          activeBoldActions: activeBoldActions.length,
          completedBoldActions: completedBoldActions.length,
          overallProgress: userData.overallProgress || 0
        })
        
        // Fetch trainings
        const progressRef = doc(db, `users/${unwrappedParams.id}/progress/trainings`)
        const progressDoc = await getDoc(progressRef)
        const progressData = progressDoc.exists() ? progressDoc.data() : {}
        
        // Get all training IDs from progress data
        const trainingIds = Object.keys(progressData)
        
        // Fetch training titles from trainings collection
        const trainingsData = await Promise.all(
          trainingIds.map(async (trainingId) => {
            const progress = progressData[trainingId] || {}
            try {
              const trainingDoc = await getDoc(doc(db, 'trainings', trainingId))
              return {
                id: trainingId,
                title: trainingDoc.exists() ? trainingDoc.data()?.title : trainingId,
                videoCompleted: progress.videoCompleted || false,
                worksheetCompleted: progress.worksheetCompleted || false,
                trainingDate: progress.lastUpdated?.toDate() || null
              }
            } catch (error) {
              console.error('Error fetching training:', error)
              // Fallback if fetch fails
              return {
                id: trainingId,
                title: trainingId,
                videoCompleted: progress.videoCompleted || false,
                worksheetCompleted: progress.worksheetCompleted || false,
                trainingDate: progress.lastUpdated?.toDate() || null
              }
            }
          })
        )
        setTrainings(trainingsData)
        
        // Fetch worksheets
        const worksheetsQuery = query(
          collection(db, 'worksheets'),
          where('userId', '==', unwrappedParams.id),
          orderBy('completionDate', 'desc')
        )
        const worksheetsSnapshot = await getDocs(worksheetsQuery)
        const worksheetsData = await Promise.all(worksheetsSnapshot.docs.map(async (doc) => {
          const data = doc.data()
          const trainingDoc = await getDoc(doc(db, 'trainings', data.trainingId))
          return {
            id: doc.id,
            trainingTitle: trainingDoc.exists() ? trainingDoc.data()?.title : 'Unknown Training',
            completionDate: data.completionDate?.toDate() || new Date(),
            answers: data.answers || {}
          }
        }))
        setWorksheets(worksheetsData)
        
        // Fetch meeting notes (only for supervisors and executives)
        if (userData.meetingNotes) {
          setMeetingNotes(userData.meetingNotes)
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
  }, [currentUser, unwrappedParams.id, router, currentUserRole])

  const handlePrevWorksheet = () => {
    setCurrentWorksheetIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const handleNextWorksheet = () => {
    setCurrentWorksheetIndex((prev) => (prev < worksheets.length - 1 ? prev + 1 : prev))
  }

  const saveMeetingNote = async () => {
    if (newNote.trim()) {
      try {
        const newMeetingNote: MeetingNote = {
          date: Timestamp.now(),
          note: newNote.trim(),
        }

        if (isAddingBoldAction && newBoldAction.trim() && newExpectedTimeframe) {
          newMeetingNote.boldAction = newBoldAction.trim();
          newMeetingNote.expectedTimeframe = newExpectedTimeframe;
        }

        const userRef = doc(db, 'users', unwrappedParams.id)
        await updateDoc(userRef, {
          meetingNotes: arrayUnion(newMeetingNote)
        })

        setMeetingNotes([...meetingNotes, newMeetingNote])
        setNewNote('')
        setNewBoldAction('')
        setNewExpectedTimeframe(undefined)
        setIsAddingBoldAction(false)

        toast({
          title: "Success",
          description: "Meeting note saved successfully.",
        })
      } catch (error) {
        console.error('Error saving meeting note:', error)
        toast({
          title: "Error",
          description: "Failed to save meeting note. Please try again.",
          variant: "destructive",
        })
      }
    }
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
  const canViewMeetingNotes = currentUserRole === 'supervisor' || currentUserRole === 'executive'

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
        
        {user?.role === 'team_member' && (
          <Button variant="outline" onClick={() => router.push(`/user-details/${user.supervisorId}`)}>
            View Supervisor
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{user?.firstName} {user?.lastName}</h1>
          <p className="text-lg text-muted-foreground">{user?.email}</p>
          <p className="text-sm text-muted-foreground">Role: {user?.role}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              Total completion across all activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{kpis?.overallProgress.toFixed(1)}% Complete</span>
                <span>{48 - (kpis?.completedTrainings + kpis?.completedWorksheets + kpis?.completedBoldActions)} Remaining</span>
              </div>
              <Progress value={kpis?.overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Status</CardTitle>
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
                  <p className="text-sm font-medium">Bold Actions</p>
                  <div className="text-2xl font-bold">{kpis?.activeBoldActions}</div>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Trainings</p>
                  <div className="text-2xl font-bold">{kpis?.completedTrainings}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {kpis?.activeBoldActions > 0
                    ? `${user?.firstName} has ${kpis?.activeBoldActions} active Bold Action${kpis?.activeBoldActions > 1 ? 's' : ''}. Follow up to ensure progress.`
                    : kpis?.overallProgress >= 90
                    ? `${user?.firstName} is making excellent progress. Consider setting more challenging goals.`
                    : `${user?.firstName} may need additional support or motivation. Schedule a check-in.`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Worksheet Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Completed</p>
                    <div className="text-2xl font-bold">{kpis?.completedWorksheets}</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Success Rate</p>
                    <div className="text-2xl font-bold">
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
          <TabsList>
            <TabsTrigger value="actions">Bold Actions</TabsTrigger>
            <TabsTrigger value="training">Training Progress</TabsTrigger>
            <TabsTrigger value="worksheets">Worksheet Answers</TabsTrigger>
            {canViewMeetingNotes && <TabsTrigger value="notes">Meeting Notes</TabsTrigger>}
          </TabsList>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timeframe</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boldActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">{action.action}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {action.status === 'completed' ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Completed</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">Active</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{action.timeframe}</TableCell>
                        <TableCell>{action.createdAt.toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Training</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Worksheet</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainings.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell className="font-medium">{training.title}</TableCell>
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
                        <TableCell>
                          {training.trainingDate ? 
                            (training.trainingDate instanceof Date ? 
                              training.trainingDate.toLocaleDateString() : 
                              new Date(training.trainingDate.seconds * 1000).toLocaleDateString()
                            ) : 'Not completed'
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
            <Card>
              <CardContent className="pt-6">
                {worksheets.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <Button onClick={handlePrevWorksheet} disabled={currentWorksheetIndex === 0}>
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm font-medium">
                        {worksheets[currentWorksheetIndex].trainingTitle}
                        <span className="text-muted-foreground ml-2">
                          ({new Date(worksheets[currentWorksheetIndex].completionDate).toLocaleDateString()})
                        </span>
                      </span>
                      <Button onClick={handleNextWorksheet} disabled={currentWorksheetIndex === worksheets.length - 1}>
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(worksheets[currentWorksheetIndex].answers).map(([question, answer], index) => (
                        <div key={index} className="space-y-2">
                          <Label className="text-sm font-medium">{question}</Label>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">No worksheets completed yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canViewMeetingNotes && (
            <TabsContent value="notes">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Bold Action</TableHead>
                        <TableHead>Expected Timeframe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetingNotes.map((note, index) => (
                        <TableRow key={index}>
                          <TableCell>{note.date.toDate().toLocaleDateString()}</TableCell>
                          <TableCell>{note.note}</TableCell>
                          <TableCell>{note.boldAction || 'N/A'}</TableCell>
                          <TableCell>{note.expectedTimeframe || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="space-y-4 pt-4 border-t">
                    <Textarea
                      placeholder="Add a new meeting note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="add-bold-action"
                        checked={isAddingBoldAction}
                        onCheckedChange={(checked) => setIsAddingBoldAction(checked as boolean)}
                      />
                      <Label htmlFor="add-bold-action">Add Bold Action</Label>
                    </div>
                    {isAddingBoldAction && (
                      <div className="space-y-4">
                        <Input
                          placeholder="Enter new Bold Action"
                          value={newBoldAction}
                          onChange={(e) => setNewBoldAction(e.target.value)}
                        />
                        <Select value={newExpectedTimeframe} onValueChange={setNewExpectedTimeframe}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select expected timeframe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1 Week">1 Week</SelectItem>
                            <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                            <SelectItem value="3 Weeks">3 Weeks</SelectItem>
                            <SelectItem value="1 Month">1 Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={saveMeetingNote}>Save Note</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

