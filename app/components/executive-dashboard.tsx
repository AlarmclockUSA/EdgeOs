'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

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
  role: string
  supervisorId: string
  latestBoldAction?: BoldAction
  latestTraining?: Training
}

interface WeeklyData {
  trainings: { completed: boolean; timestamp: Date }[]
  boldActions: { completed: boolean; timestamp: Date }[]
  standups: { completed: boolean; timestamp: Date }[]
  weekStartDate: Date
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  role: string
  supervisorId: string
  weeklyProgress?: WeeklyData
  fourWeekProgress?: any // TODO: Define specific type if needed
}

interface TeamMetrics {
  supervisorName: string
  teamSize: number
  members: TeamMember[]
}

interface WeeklyMetrics {
  trainings: { completed: number; total: number }
  boldActions: { completed: number; total: number }
  standups: { completed: number; total: number }
  teams: TeamMetrics[]
}

interface CacheData {
  metrics: WeeklyMetrics;
  users: User[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY = 'executiveDashboardCache';

const formatDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
  return new Date(dateValue);
};

const formatDisplayDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export default function ExecutiveDashboard() {
  const { userRole, companyName } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics>({
    trainings: { completed: 0, total: 0 },
    boldActions: { completed: 0, total: 0 },
    standups: { completed: 0, total: 0 },
    teams: []
  })

  const getCachedData = (): CacheData | null => {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (!cached) return null;
    
    try {
      const parsedCache = JSON.parse(cached) as CacheData
      const now = Date.now()
      
      if (now - parsedCache.timestamp <= CACHE_DURATION) {
        return parsedCache
      }
    } catch (error) {
      console.error('Error parsing cached data:', error)
    }
    return null
  }

  const setCachedData = (metrics: WeeklyMetrics, users: User[]) => {
    const cacheData: CacheData = {
      metrics,
      users,
      timestamp: Date.now()
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  }

  const fetchUserWeeklyData = async (userId: string, supervisorId: string): Promise<WeeklyData[]> => {
    const now = new Date()
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 0 }) // Ensure week starts on Sunday
    console.log('Date calculations:', {
      now: now.toISOString(),
      startOfThisWeek: startOfThisWeek.toISOString(),
      nowTime: now.getTime(),
      startOfThisWeekTime: startOfThisWeek.getTime()
    })
    
    const weeklyData: WeeklyData[] = []

    try {
      // Fetch trainings completed this week
      const progressRef = doc(db, `users/${userId}/progress/trainings`)
      const progressDoc = await getDoc(progressRef)
      const progressData = progressDoc.exists() ? progressDoc.data() : {}
      
      console.log('Training progress data:', {
        userId,
        progressData,
        startOfThisWeek: startOfThisWeek.toISOString()
      })
      
      const trainings = Object.entries(progressData)
        .filter(([trainingId, data]: [string, any]) => {
          if (!data.lastUpdated) {
            console.log(`No lastUpdated timestamp for training ${trainingId}`)
            return false;
          }
          
          // Convert the timestamp to a Date object
          let updateDate: Date;
          try {
            if (data.lastUpdated.toDate) {
              updateDate = data.lastUpdated.toDate();
            } else if (data.lastUpdated.seconds) {
              updateDate = new Date(data.lastUpdated.seconds * 1000);
            } else {
              updateDate = new Date(data.lastUpdated);
            }
            
            const updateTime = updateDate.getTime();
            const weekStartTime = startOfThisWeek.getTime();
            const isThisWeek = updateTime >= weekStartTime;
            const isCompleted = data.videoCompleted === true && data.worksheetCompleted === true;
            
            console.log('Training completion check:', {
              trainingId,
              updateDate: updateDate.toISOString(),
              updateTime,
              weekStartTime,
              isThisWeek,
              isCompleted,
              videoCompleted: data.videoCompleted,
              worksheetCompleted: data.worksheetCompleted,
              timeDiff: updateTime - weekStartTime
            })
            
            return isThisWeek && isCompleted;
          } catch (error) {
            console.error('Error processing training date:', error)
            return false;
          }
        })
        .map(([id, data]: [string, any]) => {
          let timestamp: Date;
          if (data.lastUpdated.toDate) {
            timestamp = data.lastUpdated.toDate();
          } else if (data.lastUpdated.seconds) {
            timestamp = new Date(data.lastUpdated.seconds * 1000);
          } else {
            timestamp = new Date(data.lastUpdated);
          }
          
          return {
            completed: true,
            timestamp
          };
        });
      
      console.log('Filtered trainings:', {
        userId,
        trainingsCount: trainings.length,
        trainings
      });

      // Fetch bold actions - both created and completed this week
      const boldActionsRef = collection(db, `users/${userId}/boldActions`)
      
      // Get bold actions completed this week
      const completedBoldActionsQuery = query(
        boldActionsRef,
        where('completedAt', '>=', startOfThisWeek),
        where('status', '==', 'completed'),
        orderBy('completedAt', 'desc')
      )
      const completedBoldActionsSnapshot = await getDocs(completedBoldActionsQuery)
      
      // Get bold actions created this week that are still active
      const activeBoldActionsQuery = query(
        boldActionsRef,
        where('createdAt', '>=', startOfThisWeek),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      )
      const activeBoldActionsSnapshot = await getDocs(activeBoldActionsQuery)

      // Combine bold actions, prioritizing completed ones
      const allBoldActions = new Map()
      
      // Add completed bold actions
      completedBoldActionsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        allBoldActions.set(doc.id, {
          completed: true,
          timestamp: data.completedAt
        })
      })
      
      // Add active bold actions if not already included
      activeBoldActionsSnapshot.docs.forEach(doc => {
        if (!allBoldActions.has(doc.id)) {
          const data = doc.data()
          allBoldActions.set(doc.id, {
            completed: false,
            timestamp: data.createdAt
          })
        }
      })
      
      // Fetch standups - include both scheduled and completed standups for this week
      const standupsRef = collection(db, `users/${userId}/standups`)
      const standupsQuery = query(
        standupsRef,
        where('scheduledFor', '>=', startOfThisWeek),
        where('supervisorId', '==', supervisorId),
        orderBy('scheduledFor', 'desc')
      )
      const standupsSnapshot = await getDocs(standupsQuery)

      // Also fetch standups that were completed this week but might have been scheduled earlier
      const completedStandupsQuery = query(
        standupsRef,
        where('completedAt', '>=', startOfThisWeek),
        where('status', '==', 'completed'),
        where('supervisorId', '==', supervisorId),
        orderBy('completedAt', 'desc')
      )
      const completedStandupsSnapshot = await getDocs(completedStandupsQuery)

      // Combine and deduplicate standups
      const allStandups = new Map()
      
      // Add scheduled standups
      standupsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        // Only include standups for this supervisor
        if (data.supervisorId === supervisorId) {
          allStandups.set(doc.id, {
            completed: data.status === 'completed',
            timestamp: data.completedAt || data.scheduledFor,
            scheduledFor: data.scheduledFor
          })
        }
      })

      // Add completed standups
      completedStandupsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        // Only include standups for this supervisor
        if (data.supervisorId === supervisorId && !allStandups.has(doc.id)) {
          allStandups.set(doc.id, {
            completed: true,
            timestamp: data.completedAt,
            scheduledFor: data.scheduledFor
          })
        }
      })

      weeklyData.push({
        trainings,
        boldActions: Array.from(allBoldActions.values()),
        standups: Array.from(allStandups.values()).map(standup => ({
          completed: standup.completed,
          timestamp: standup.timestamp
        })),
        weekStartDate: startOfThisWeek
      })

      return weeklyData
    } catch (error) {
      console.error(`Error fetching weekly data for user ${userId}:`, error)
      return []
    }
  }

  const fetchUserFourWeekProgress = async (userId: string): Promise<{
    totalTrainings: number;
    totalBoldActions: number;
    totalStandups: number;
  }> => {
    const startOfThisWeek = startOfWeek(new Date())
    const fourWeeksAgo = new Date(startOfThisWeek)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 21) // Go back 3 weeks (21 days) to get 4 weeks total

    try {
      // Fetch completed trainings
      const progressRef = doc(db, `users/${userId}/progress/trainings`)
      const progressDoc = await getDoc(progressRef)
      const progressData = progressDoc.exists() ? progressDoc.data() : {}
      
      const completedTrainings = Object.values(progressData).filter((data: any) => 
        data.videoCompleted && 
        data.worksheetCompleted && 
        data.lastUpdated?.toDate() >= fourWeeksAgo
      ).length

      // Fetch completed bold actions
      const boldActionsRef = collection(db, `users/${userId}/boldActions`)
      const boldActionsQuery = query(
        boldActionsRef,
        where('createdAt', '>=', fourWeeksAgo),
        where('status', '==', 'completed')
      )
      const boldActionsSnapshot = await getDocs(boldActionsQuery)

      // Fetch completed standups
      const standupsRef = collection(db, `users/${userId}/standups`)
      const standupsQuery = query(
        standupsRef,
        where('scheduledFor', '>=', fourWeeksAgo),
        where('status', '==', 'completed')
      )
      const standupsSnapshot = await getDocs(standupsQuery)

      return {
        totalTrainings: completedTrainings,
        totalBoldActions: boldActionsSnapshot.size,
        totalStandups: standupsSnapshot.size
      }
    } catch (error) {
      console.error(`Error fetching four week progress for user ${userId}:`, error)
      return {
        totalTrainings: 0,
        totalBoldActions: 0,
        totalStandups: 0
      }
    }
  }

  const fetchWeeklyMetrics = useCallback(async () => {
    try {
      if (!companyName) {
        console.error('Company name not available')
        return
      }

      setLoadingProgress(10)
      const usersRef = collection(db, 'users')
      // Query supervisors from the same company
      const supervisorsQuery = query(
        usersRef,
        where('companyName', '==', companyName),
        where('role', '==', 'supervisor')
      )
      const supervisorsSnapshot = await getDocs(supervisorsQuery)
      setLoadingProgress(30)

      let completedTrainings = 0
      let totalTrainings = 0
      let completedBoldActions = 0
      let totalBoldActions = 0
      let completedStandups = 0
      let totalStandups = 0
      const teamsMetrics = []

      const totalSupervisors = supervisorsSnapshot.docs.length
      let processedSupervisors = 0

      for (const supervisor of supervisorsSnapshot.docs) {
        const supervisorData = supervisor.data()
        let teamSize = 0
        const teamMembers = []

        // Query team members for this supervisor from the same company
        const teamMembersQuery = query(
          usersRef,
          where('companyName', '==', companyName),
          where('supervisorId', '==', supervisor.id),
          where('role', '==', 'team_member')
        )
        const teamMembersSnapshot = await getDocs(teamMembersQuery)
        teamSize = teamMembersSnapshot.size

        for (const memberDoc of teamMembersSnapshot.docs) {
          const memberData = memberDoc.data()
          const weeklyData = await fetchUserWeeklyData(memberDoc.id, supervisor.id)
          const fourWeekProgress = await fetchUserFourWeekProgress(memberDoc.id)

          // Update totals
          if (weeklyData[0]) {
            const newCompletedTrainings = weeklyData[0].trainings.filter(t => t.completed).length;
            completedTrainings += newCompletedTrainings;
            totalTrainings += 1; // Each team member should complete one training per week
            
            console.log('Weekly metrics update:', {
              userId: memberDoc.id,
              memberName: `${memberData.firstName} ${memberData.lastName}`,
              weeklyData: weeklyData[0],
              trainingsThisWeek: weeklyData[0].trainings,
              newCompletedTrainings,
              runningTotalCompleted: completedTrainings,
              runningTotalExpected: totalTrainings
            });

            completedBoldActions += weeklyData[0].boldActions.filter(ba => ba.completed).length;
            totalBoldActions += 1;
            completedStandups += weeklyData[0].standups.filter(s => s.completed).length;
            totalStandups += weeklyData[0].standups.length;
          }

          teamMembers.push({
            id: memberDoc.id,
            firstName: memberData.firstName || '',
            lastName: memberData.lastName || '',
            role: memberData.role || 'team_member',
            supervisorId: memberData.supervisorId || '',
            weeklyProgress: weeklyData[0], // Current week's data
            fourWeekProgress
          })
        }

        teamsMetrics.push({
          supervisorName: `${supervisorData.firstName} ${supervisorData.lastName}`,
          teamSize,
          members: teamMembers
        })

        processedSupervisors++
        // Calculate progress based on supervisor processing (from 30% to 90%)
        const supervisorProgress = (processedSupervisors / totalSupervisors) * 60
        setLoadingProgress(30 + supervisorProgress)
      }

      // Create metrics object
      const newMetrics = {
        trainings: { completed: completedTrainings, total: totalTrainings },
        boldActions: { completed: completedBoldActions, total: totalBoldActions },
        standups: { completed: completedStandups, total: totalStandups },
        teams: teamsMetrics
      };

      // Update state
      setWeeklyMetrics(newMetrics);
      
      setLoadingProgress(100)
      return newMetrics;
    } catch (error) {
      console.error('Error fetching weekly metrics:', error)
      setLoadingProgress(100)
      throw error;
    }
  }, [companyName])

  // Update fetchUsers to get the actual training title
  const fetchUsers = useCallback(async () => {
    try {
      if (!companyName) {
        console.error('Company name not available')
        setError('Company information not available')
        return
      }

      const usersRef = collection(db, 'users')
      const q = query(
        usersRef, 
        where('companyName', '==', companyName),
        where('role', 'in', ['supervisor', 'team_member'])
      )
      const querySnapshot = await getDocs(q)
      
      const usersData = await Promise.all(querySnapshot.docs.map(async userDoc => {
        const userData = userDoc.data()
        
        // Get latest bold action
        const boldActionsRef = collection(db, `users/${userDoc.id}/boldActions`)
        const boldActionsQuery = query(boldActionsRef, orderBy('createdAt', 'desc'), limit(1))
        const boldActionsSnapshot = await getDocs(boldActionsQuery)
        const latestBoldAction = boldActionsSnapshot.docs[0]?.data()
        
        // Get latest training
        const progressRef = doc(db, `users/${userDoc.id}/progress/trainings`)
        const progressDoc = await getDoc(progressRef)
        const progressData = progressDoc.exists() ? progressDoc.data() : {}
        
        // Filter and sort trainings
        const completedTrainings = Object.entries(progressData)
          .filter(([, data]: [string, any]) => data.videoCompleted && data.worksheetCompleted)
          .map(([id, data]: [string, any]) => ({
            id,
            ...data,
            lastUpdated: data.lastUpdated?.toDate?.() || new Date(data.lastUpdated)
          }))
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())

        const latestTraining = completedTrainings[0]
        
        // Get the training title from the training document if available
        let trainingTitle = 'Unknown Training';
        if (latestTraining) {
          try {
            const trainingRef = doc(db, 'trainings', latestTraining.id);
            const trainingDoc = await getDoc(trainingRef);
            if (trainingDoc.exists()) {
              trainingTitle = trainingDoc.data().title || `Training ${latestTraining.id}`;
            }
          } catch (error) {
            console.error('Error fetching training title:', error);
          }
        }
        
        return {
          id: userDoc.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || '',
          supervisorId: userData.supervisorId || '',
          latestBoldAction: latestBoldAction ? {
            id: boldActionsSnapshot.docs[0].id,
            action: latestBoldAction.action,
            status: latestBoldAction.status,
            createdAt: formatDate(latestBoldAction.createdAt),
            timeframe: latestBoldAction.timeframe
          } : undefined,
          latestTraining: latestTraining ? {
            id: latestTraining.id,
            title: trainingTitle,
            completedAt: formatDate(latestTraining.lastUpdated)
          } : undefined
        }
      }))
      
      setUsers(usersData)
      return usersData // Return the users data for caching
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
      throw error
    }
  }, [companyName])

  // Update fetchData to handle caching properly
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setLoadingProgress(0)
      
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = getCachedData()
        if (cachedData) {
          console.log('Using cached dashboard data')
          setWeeklyMetrics(cachedData.metrics)
          setUsers(cachedData.users)
          setLoading(false)
          return
        }
      }
      
      // Start continuous progress animation
      let progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return 90;
          return prev + 0.5;
        });
      }, 100);
      
      try {
        // Fetch both data sets
        const [fetchedUsers, newMetrics] = await Promise.all([
          fetchUsers(),
          fetchWeeklyMetrics()
        ])
        
        // Cache the data if both fetches were successful
        if (fetchedUsers && newMetrics) {
          setCachedData(newMetrics, fetchedUsers)
        }
        
        // Clear interval and set to 100%
        clearInterval(progressInterval);
        setLoadingProgress(100);
        
        setLoading(false);
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load dashboard data')
      setLoading(false)
    }
  }, [fetchUsers, fetchWeeklyMetrics])

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

    // Initial data fetch
    fetchData()

    // Cleanup function
    return () => {
      // No need for cleanup here anymore since intervals are managed in fetchData
    }
  }, [userRole, router, fetchData]) // Add fetchData to dependencies

  // Add a refresh handler
  const handleRefresh = () => {
    fetchData(true)
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
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <h2 className="text-xl font-medium text-black">Loading Dashboard...</h2>
        <div className="w-[300px]">
          <Progress 
            value={loadingProgress} 
            className="h-2 transition-all duration-300 ease-in-out [&>div]:bg-[#F5A525]" 
          />
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="space-y-8 pt-8">
      <div className="flex justify-between items-center">
        <ExecutiveOverview 
          weeklyTrainings={weeklyMetrics.trainings}
          weeklyBoldActions={weeklyMetrics.boldActions}
          weeklyStandups={weeklyMetrics.standups}
          teams={weeklyMetrics.teams}
        />
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="ml-4"
        >
          Refresh Data
        </Button>
      </div>

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
                            Started: {formatDisplayDate(user.latestBoldAction.createdAt)}
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
                            Completed: {formatDisplayDate(user.latestTraining.completedAt)}
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

