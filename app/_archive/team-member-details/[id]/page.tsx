'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, Video, FileText } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { toast } from "@/components/ui/use-toast"

interface TeamMemberKPIs {
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

export default function TeamMemberDetailsPage({ params }: { params: { id: string } }) {
  const [teamMember, setTeamMember] = useState<any>(null)
  const [kpis, setKPIs] = useState<TeamMemberKPIs | null>(null)
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [boldActions, setBoldActions] = useState<BoldAction[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [currentWorksheetIndex, setCurrentWorksheetIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchTeamMemberData = async () => {
      if (!user || !params.id) return

      setLoading(true)
      try {
        const teamMemberDoc = await getDoc(doc(db, 'users', params.id))
        if (teamMemberDoc.exists()) {
          const userData = teamMemberDoc.data()
          setTeamMember(userData)
          
          // Fetch KPIs directly from the user document
          const kpisData: TeamMemberKPIs = {
            currentBoldAction: userData.currentBoldAction || null,
            lastCompletedBoldAction: userData.lastCompletedBoldAction || null,
            currentTraining: userData.currentTraining || null,
            lastCompletedTraining: userData.lastCompletedTraining || null,
            completedTrainings: userData.completedTrainings || 0,
            completedWorksheets: userData.completedWorksheets || 0,
            activeBoldActions: userData.activeBoldActions || 0,
            completedBoldActions: userData.completedBoldActions || 0,
            overallProgress: userData.overallProgress || 0
          }
          setKPIs(kpisData)

          // Fetch worksheets
          const worksheetsQuery = query(
            collection(db, 'worksheets'),
            where('userId', '==', params.id)
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
          // Sort worksheets by completion date
          const sortedWorksheets = worksheetsData.sort((a, b) => b.completionDate.getTime() - a.completionDate.getTime())
          setWorksheets(sortedWorksheets)

          // Fetch bold actions
          const boldActionsQuery = query(
            collection(db, 'boldActions'),
            where('userId', '==', params.id),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
          const boldActionsSnapshot = await getDocs(boldActionsQuery)
          const boldActionsData = boldActionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          } as BoldAction))
          setBoldActions(boldActionsData)

          // Fetch trainings
          const trainingsQuery = query(
            collection(db, 'userProgress'),
            where('userId', '==', params.id),
            orderBy('completionDate', 'desc'),
            limit(5)
          )
          const trainingsSnapshot = await getDocs(trainingsQuery)
          const trainingsData = await Promise.all(trainingsSnapshot.docs.map(async (doc) => {
            const data = doc.data()
            const trainingDoc = await getDoc(doc(db, 'trainings', data.trainingId))
            return {
              id: data.trainingId,
              title: trainingDoc.exists() ? trainingDoc.data()?.title : 'Unknown Training',
              videoCompleted: data.videoCompleted || false,
              worksheetCompleted: data.worksheetCompleted || false,
              trainingDate: data.completionDate?.toDate() || new Date(),
            }
          }))
          setTrainings(trainingsData)

        } else {
          toast({
            title: "Error",
            description: "Team member not found",
            variant: "destructive",
          })
          router.push('/dashboard/supervisor')
        }
      } catch (error) {
        console.error('Error fetching team member data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch team member data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMemberData()
  }, [user, params.id, router])

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

  if (!teamMember || !kpis) {
    return <div className="flex justify-center items-center h-screen">Team member not found</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button onClick={() => router.push('/supervisor')} variant="outline">
        Back to My Team
      </Button>

      <h1 className="text-3xl font-bold">{teamMember?.firstName} {teamMember?.lastName}</h1>
      <p className="text-lg text-muted-foreground">{teamMember?.email}</p>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{kpis.overallProgress.toFixed(1)}% Complete</span>
              <span>{48 - (kpis.completedTrainings + kpis.completedWorksheets + kpis.completedBoldActions)} Remaining</span>
            </div>
            <Progress value={kpis.overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bold Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timeframe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boldActions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell>{action.action}</TableCell>
                    <TableCell>
                      {action.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>{action.timeframe}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Training</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Worksheet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell>{training.title}</TableCell>
                    <TableCell>
                      {training.videoCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Video className="h-5 w-5 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      {training.worksheetCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-yellow-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Worksheet Answers</CardTitle>
        </CardHeader>
        <CardContent>
          {worksheets.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button onClick={handlePrevWorksheet} disabled={currentWorksheetIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {worksheets[currentWorksheetIndex].trainingTitle} ({new Date(worksheets[currentWorksheetIndex].completionDate).toLocaleDateString()})
                </span>
                <Button onClick={handleNextWorksheet} disabled={currentWorksheetIndex === worksheets.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {Object.entries(worksheets[currentWorksheetIndex].answers).map(([question, answer], index) => (
                  <div key={index}>
                    <p className="text-sm font-semibold">{question}</p>
                    <p className="text-sm">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No worksheets completed yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            {/* Choose the appropriate icon based on the team member's status */}
            {kpis.activeBoldActions > 0 ? (
              <Clock className="h-5 w-5 text-yellow-500" />
            ) : kpis.overallProgress >= 90 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            {/* Display a short status message */}
            <span>
              {kpis.activeBoldActions > 0
                ? "Has active Bold Actions"
                : kpis.overallProgress >= 90
                ? "On track"
                : "Needs attention"}
            </span>
          </div>
          {/* Provide a more detailed description of the team member's status */}
          <p className="text-sm text-muted-foreground">
            {kpis.activeBoldActions > 0
              ? `${teamMember.firstName} has ${kpis.activeBoldActions} active Bold Action${kpis.activeBoldActions > 1 ? 's' : ''}. Follow up to ensure progress.`
              : kpis.overallProgress >= 90
              ? `${teamMember.firstName} is making excellent progress. Consider setting more challenging goals.`
              : `${teamMember.firstName} may need additional support or motivation. Schedule a check-in.`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

