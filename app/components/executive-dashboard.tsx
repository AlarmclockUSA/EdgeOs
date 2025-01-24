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

interface User {
  id: string
  firstName: string
  lastName: string
  latestBoldAction?: BoldAction
  latestTraining?: Training
}

export default function ExecutiveDashboard() {
  const { userRole } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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
        setLoading(false)
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to fetch users')
        setLoading(false)
      }
    }

    fetchUsers()
  }, [userRole, router])

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
    <div className="pt-8">
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

