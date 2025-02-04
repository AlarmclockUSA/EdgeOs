'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScheduleStandupModal } from './modals/schedule-standup-modal'
import { UpcomingStandups } from './upcoming-standups'

interface TeamMember {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  currentBoldAction: string
  currentTraining: string
  department: string
  needsFollowUp: boolean
  boldActions?: any[]
  role: string
  supervisorId: string
}

export default function SupervisorDashboard() {
  const { user, companyName } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return
      
      try {
        const usersRef = collection(db, 'users')
        const q = query(
          usersRef, 
          where('companyName', '==', companyName),
          where('supervisorId', '==', user.uid)
        )
        const querySnapshot = await getDocs(q)
        
        const membersWithBoldActions = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const data = doc.data()
          
          // Fetch bold actions from subcollection
          const boldActionsQuery = query(
            collection(db, `users/${doc.id}/boldActions`),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
          )
          
          try {
            const boldActionsSnapshot = await getDocs(boldActionsQuery)
            const activeBoldAction = boldActionsSnapshot.docs[0]?.data()

            return {
              id: doc.id,
              name: `${data.firstName} ${data.lastName}`,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              currentBoldAction: activeBoldAction ? activeBoldAction.action : 'No current action',
              currentTraining: data.currentTraining || 'No current training',
              department: data.department || 'N/A',
              needsFollowUp: activeBoldAction ? activeBoldAction.needsFollowUp || false : false,
              boldActions: boldActionsSnapshot.docs.map(doc => doc.data()),
              role: data.role || 'team_member',
              supervisorId: data.supervisorId
            }
          } catch (error) {
            console.error(`Error fetching bold actions for ${data.firstName} ${data.lastName}:`, error)
            return {
              id: doc.id,
              name: `${data.firstName} ${data.lastName}`,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              currentBoldAction: 'Error fetching bold actions',
              currentTraining: data.currentTraining || 'No current training',
              department: data.department || 'N/A',
              needsFollowUp: false,
              boldActions: [],
              role: data.role || 'team_member',
              supervisorId: data.supervisorId
            }
          }
        }))
        
        console.log('Fetched team members:', membersWithBoldActions)
        setTeamMembers(membersWithBoldActions)
      } catch (error) {
        console.error('Error fetching team members:', error)
        setError('Failed to fetch team members. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [user, companyName])

  const filteredMembers = teamMembers.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.currentBoldAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.currentTraining.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="pt-8">
      {/* 5-Minute Stand ups Card */}
      <Card className="bg-white rounded-none border-0 mb-8">
        <CardHeader className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB]">
          <CardTitle className="text-xl sm:text-2xl font-semibold text-white">5-Minute Stand ups</CardTitle>
          <p className="text-white/80">Quick check-ins with your team leader</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <UpcomingStandups />
        </CardContent>
      </Card>

      {/* Team Overview Card */}
      <Card className="bg-white rounded-none border-0">
        <CardHeader>
          <CardTitle className="text-[#333333]">Team Overview</CardTitle>
          <p className="text-[#666666] mt-1.5">
            Monitor and manage your team's progress and performance.
          </p>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search team members..."
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
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="border-gray-200">
                    <TableCell className="text-[#333333] font-medium">
                      {member.firstName} {member.lastName}
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {member.currentBoldAction || 'No active bold action'}
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {member.currentTraining || 'No training in progress'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/user-details/${member.id}`)}
                          className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMember(member)}
                          className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
                        >
                          Schedule Standup
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedMember && (
        <ScheduleStandupModal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          teamMember={selectedMember}
        />
      )}
    </div>
  )
} 