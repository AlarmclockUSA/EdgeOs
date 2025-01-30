'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from '@/lib/auth-context'
import { toast } from "@/components/ui/use-toast"
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, DocumentData } from 'firebase/firestore'
import { startOfWeek } from 'date-fns'
import ExecutiveOverview from './executive-overview'

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
  completedAt: Date
}

interface User {
  id: string
  firstName: string
  lastName: string
  latestBoldAction?: BoldAction
  latestTraining?: Training
}

const formatDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
  return new Date(dateValue);
};

export default function ExecutiveDashboard() {
  const { userRole } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [weeklyMetrics, setWeeklyMetrics] = useState({
    boldActions: { completed: 0, total: 0 },
    standups: { completed: 0, total: 0 },
    teams: []
  })

  const fetchWeeklyMetrics = async () => {
    try {
      const startOfThisWeek = startOfWeek(new Date())
      const fourWeeksAgo = new Date(startOfThisWeek)
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 21) // Go back 3 weeks (21 days) to get 4 weeks total
      
      const usersRef = collection(db, 'users')
      const supervisorsQuery = query(usersRef, where('role', '==', 'supervisor'))
      const supervisorsSnapshot = await getDocs(supervisorsQuery)

      let totalBoldActions = 0
      let completedBoldActions = 0
      let totalStandups = 0
      let completedStandups = 0
      const teamsMetrics = []

      for (const supervisorDoc of supervisorsSnapshot.docs) {
        const supervisor = supervisorDoc.data()

        const teamQuery = query(usersRef, where('supervisorId', '==', supervisorDoc.id))
        const teamSnapshot = await getDocs(teamQuery)
        const teamSize = teamSnapshot.size

        let teamBoldActionsCompleted = 0
        let teamStandupsCompleted = 0
        const teamMembers = []

        for (const memberDoc of teamSnapshot.docs) {
          const memberData = memberDoc.data()
          
          // Fetch 4 weeks of data
          const weeklyData = []
          for (let i = 0; i < 4; i++) {
            const weekStart = new Date(startOfThisWeek)
            weekStart.setDate(weekStart.getDate() - (i * 7))
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 7)

            // Fetch bold actions for this week
            const boldActionsRef = collection(db, `users/${memberDoc.id}/boldActions`)
            const boldActionsQuery = query(
              boldActionsRef,
              where('createdAt', '>=', weekStart),
              where('createdAt', '<', weekEnd),
              where('status', '==', 'completed')
            )
            const boldActionsSnapshot = await getDocs(boldActionsQuery)

            // Fetch standups for this week
            const standupsRef = collection(db, `users/${memberDoc.id}/standups`)
            const standupsQuery = query(
              standupsRef,
              where('scheduledFor', '>=', weekStart),
              where('scheduledFor', '<', weekEnd),
              where('status', '==', 'completed')
            )
            const standupsSnapshot = await getDocs(standupsQuery)

            // Fetch training progress for this week
            const progressRef = doc(db, `users/${memberDoc.id}/progress/trainings`)
            const progressDoc = await getDoc(progressRef)
            const progressData = progressDoc.exists() ? progressDoc.data() : {}

            const weeklyProgress = {
              trainings: Object.entries(progressData)
                .filter(([_, data]: [string, any]) => {
                  const updateDate = data.lastUpdated?.toDate?.() || new Date()
                  return updateDate >= weekStart && updateDate < weekEnd
                })
                .map(([_, data]: [string, any]) => ({
                  timestamp: data.lastUpdated?.toDate?.() || new Date(),
                  completed: data.videoCompleted && data.worksheetCompleted
                })),
              boldActions: boldActionsSnapshot.docs.map(doc => {
                const data = doc.data()
                const completedAt = data.completedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date()
                return {
                  timestamp: completedAt,
                  completed: data.status === 'completed'
                }
              }),
              standups: standupsSnapshot.docs.map(doc => {
                const data = doc.data()
                return {
                  timestamp: data.scheduledFor?.toDate?.() || new Date(),
                  completed: data.status === 'completed'
                }
              }),
              weekStartDate: weekStart
            }

            weeklyData.push(weeklyProgress)

            // Count totals for the current week (i === 0)
            if (i === 0) {
              totalBoldActions += 1
              if (boldActionsSnapshot.size > 0) {
                completedBoldActions += 1
                teamBoldActionsCompleted += 1
              }

              totalStandups += 1
              if (standupsSnapshot.size > 0) {
                completedStandups += 1
                teamStandupsCompleted += 1
              }
            }
          }

          // Calculate 4-week totals
          const fourWeekProgress = {
            weeklyData,
            totalTrainings: weeklyData.reduce((sum, week) => 
              sum + week.trainings.filter(t => t.completed).length, 0),
            totalBoldActions: weeklyData.reduce((sum, week) => 
              sum + week.boldActions.filter(b => b.completed).length, 0),
            totalStandups: weeklyData.reduce((sum, week) => 
              sum + week.standups.filter(s => s.completed).length, 0)
          }

          teamMembers.push({
            id: memberDoc.id,
            firstName: memberData.firstName || '',
            lastName: memberData.lastName || '',
            weeklyProgress: weeklyData[0], // Current week's data
            fourWeekProgress
          })
        }

        teamsMetrics.push({
          supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
          teamSize,
          members: teamMembers
        })
      }

      setWeeklyMetrics({
        boldActions: { completed: completedBoldActions, total: totalBoldActions },
        standups: { completed: completedStandups, total: totalStandups },
        teams: teamsMetrics
      })
    } catch (error) {
      console.error('Error fetching weekly metrics:', error)
    }
  }

  useEffect(() => {
    if (userRole !== 'executive') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this page.",
        variant: "destructive",
      })
      router.push('/')
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        await Promise.all([
          fetchUsers(),
          fetchWeeklyMetrics()
        ])
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userRole, router])

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users')
      const querySnapshot = await getDocs(usersRef)
      
      const usersPromises = querySnapshot.docs.map(async userDoc => {
        const userData = userDoc.data()
        const userId = userDoc.id
        
        try {
            // Fetch bold actions
          const boldActionsRef = collection(db, `users/${userId}/boldActions`)
          const boldActionsQuery = query(
            boldActionsRef,
            orderBy('createdAt', 'desc'),
            limit(1)
          )
          const boldActionsSnapshot = await getDocs(boldActionsQuery)
          
          let latestBoldAction: BoldAction | undefined

          if (!boldActionsSnapshot.empty) {
            const boldActionDoc = boldActionsSnapshot.docs[0]
            const boldActionData = boldActionDoc.data()
            if (boldActionData.status === 'active') {
              latestBoldAction = {
                id: boldActionDoc.id,
                action: boldActionData.action,
                status: boldActionData.status,
                createdAt: formatDate(boldActionData.createdAt),
                timeframe: boldActionData.timeframe
              }
            }
          }

            // Fetch latest training progress
          const progressRef = doc(db, `users/${userId}/progress/trainings`)
          const progressDoc = await getDoc(progressRef)
          const progressData = progressDoc.exists() ? progressDoc.data() : {}
          
          let latestTraining: Training | undefined

            // Find the most recent training by lastUpdated
          let mostRecentTraining = null
          let mostRecentDate = new Date(0)

            // Type-safe iteration over progress data
          Object.entries(progressData as DocumentData).forEach(([trainingId, progressValue]) => {
            const progress = progressValue as { videoCompleted: boolean; worksheetCompleted: boolean; lastUpdated: { toDate: () => Date } }
            if (progress?.lastUpdated?.toDate) {
              const updateDate = progress.lastUpdated.toDate()
              if (updateDate > mostRecentDate) {
                mostRecentDate = updateDate
                mostRecentTraining = { id: trainingId, progress }
              }
            }
          })

          if (mostRecentTraining) {
            try {
                // Fetch training title from trainings collection
              const trainingRef = doc(db, 'trainings', mostRecentTraining.id)
              const trainingDoc = await getDoc(trainingRef)
              latestTraining = {
                id: mostRecentTraining.id,
                title: trainingDoc.exists() ? trainingDoc.data()?.title : `Training ${mostRecentTraining.id}`,
                completedAt: mostRecentDate
              }
            } catch (error) {
              console.error('Error fetching training title:', error)
              latestTraining = {
                id: mostRecentTraining.id,
                title: `Training ${mostRecentTraining.id}`,
                completedAt: mostRecentDate
              }
            }
          }

          return {
            id: userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            latestBoldAction,
            latestTraining
          }
        } catch (err) {
          console.error(`Error fetching data for user ${userId}:`, err)
          return {
            id: userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || ''
          }
        }
      })

      const usersData = await Promise.all(usersPromises)
      setUsers(usersData)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to fetch users')
    }
  }

  const filteredUsers = users.filter(user => {
    const searchString = searchTerm.toLowerCase()
    return (
      user.firstName?.toLowerCase().includes(searchString) ||
      user.lastName?.toLowerCase().includes(searchString) ||
      user.latestBoldAction?.action?.toLowerCase().includes(searchString) ||
      user.latestTraining?.title?.toLowerCase().includes(searchString)
    )
  })

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="space-y-8 pt-8">
      <ExecutiveOverview 
        weeklyBoldActions={weeklyMetrics.boldActions}
        weeklyStandups={weeklyMetrics.standups}
        teams={weeklyMetrics.teams}
      />

      <Card className="bg-white rounded-none border-0">
        <CardHeader>
          <CardTitle className="text-[#333333]">Company Overview</CardTitle>
          <p className="text-[#666666] mt-1.5">
            Monitor and manage company-wide progress and performance.
          </p>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 bg-white text-[#333333] border-gray-200"
          />
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-[#333333]">Name</TableHead>
                  <TableHead className="text-[#333333]">Current Bold Action</TableHead>
                  <TableHead className="text-[#333333]">Latest Training</TableHead>
                  <TableHead className="text-[#333333]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-gray-200">
                    <TableCell className="text-[#333333] font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {user.latestBoldAction ? (
                        <div>
                          <div className="text-[#333333]">{user.latestBoldAction.action}</div>
                          <div className="text-sm text-[#666666]">
                            Started: {user.latestBoldAction.createdAt.toLocaleDateString()}
                            <br />
                            Timeframe: {user.latestBoldAction.timeframe}
                          </div>
                        </div>
                      ) : (
                        'No active bold action'
                      )}
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {user.latestTraining ? (
                        <div>
                          <div className="text-[#333333]">{user.latestTraining.title}</div>
                          <div className="text-sm text-[#666666]">
                            Completed: {user.latestTraining.completedAt.toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        'No completed trainings'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => router.push(`/user-details/${user.id}`)}
                        variant="outline"
                        size="sm"
                        className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

