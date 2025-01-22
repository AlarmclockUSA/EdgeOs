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

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  latestBoldAction?: BoldAction
  latestTraining?: Training
}

export default function SupervisorDashboard() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userRole !== 'supervisor' && userRole !== 'executive') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this page.",
        variant: "destructive",
      })
      router.push('/')
      return
    }

    const fetchTeamMembers = async () => {
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('supervisorId', '==', user?.uid))
        const querySnapshot = await getDocs(q)
        
        const teamMembersPromises = querySnapshot.docs.map(async userDoc => {
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
                  createdAt: boldActionData.createdAt?.toDate(),
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
            let mostRecentTraining: { id: string; progress: any } | null = null
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
            console.error(`Error fetching data for team member ${userId}:`, err)
            return {
              id: userId,
              firstName: userData.firstName || '',
              lastName: userData.lastName || ''
            }
          }
        })

        const teamMembersData = await Promise.all(teamMembersPromises)
        setTeamMembers(teamMembersData)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching team members:', err)
        setError('Failed to fetch team members')
        setLoading(false)
      }
    }

    if (user?.uid) {
      fetchTeamMembers()
    }
  }, [userRole, router, user?.uid])

  const filteredTeamMembers = teamMembers.filter(member => {
    const searchString = searchTerm.toLowerCase()
    return (
      member.firstName?.toLowerCase().includes(searchString) ||
      member.lastName?.toLowerCase().includes(searchString) ||
      member.latestBoldAction?.action?.toLowerCase().includes(searchString) ||
      member.latestTraining?.title?.toLowerCase().includes(searchString)
    )
  })

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">My Team</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Current Bold Action</TableHead>
                  <TableHead>Latest Training</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.firstName} {member.lastName}</TableCell>
                    <TableCell>
                      {member.latestBoldAction ? (
                        <div>
                          <div>{member.latestBoldAction.action}</div>
                          <div className="text-sm text-gray-500">
                            Started: {member.latestBoldAction.createdAt.toLocaleDateString()}
                            <br />
                            Timeframe: {member.latestBoldAction.timeframe}
                          </div>
                        </div>
                      ) : (
                        'No active bold action'
                      )}
                    </TableCell>
                    <TableCell>
                      {member.latestTraining ? (
                        <div>
                          <div>{member.latestTraining.title}</div>
                          <div className="text-sm text-gray-500">
                            Completed: {member.latestTraining.completedAt.toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        'No completed trainings'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => router.push(`/user-details/${member.id}`)}
                        variant="outline"
                        size="sm"
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

