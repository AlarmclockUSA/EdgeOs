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
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Team</h1>
      
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
          
          {teamMembers.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-lg text-gray-600 text-center">
                  You don't have any team members yet, speak to your team leader
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Bold Action</TableHead>
                    <TableHead>Current Training</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Needs Follow Up</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.currentBoldAction}</TableCell>
                      <TableCell>{member.currentTraining}</TableCell>
                      <TableCell>{member.department}</TableCell>
                      <TableCell>{member.needsFollowUp ? 'Yes' : 'No'}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
} 