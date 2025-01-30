'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/lib/auth-context'
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  supervisorId?: string
  department?: string
}

export default function ExecutiveDashboard() {
  const { user, userRole } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

    const fetchTeamMembers = async () => {
      if (!user) return

      try {
        const usersRef = collection(db, 'users')
        const usersQuery = query(usersRef)
        const snapshot = await getDocs(usersQuery)
        
        const members = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamMember[]

        setTeamMembers(members)
      } catch (error) {
        console.error('Error fetching team members:', error)
        toast({
          title: "Error",
          description: "Failed to fetch team members.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [user, userRole, router])

  const handleViewDetails = (userId: string) => {
    router.push(`/user-details/${userId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const supervisors = teamMembers.filter(member => member.role === 'supervisor')
  const teamMembersBySupervisor = teamMembers.reduce((acc, member) => {
    if (member.role === 'team_member' && member.supervisorId) {
      if (!acc[member.supervisorId]) {
        acc[member.supervisorId] = []
      }
      acc[member.supervisorId].push(member)
    }
    return acc
  }, {} as Record<string, TeamMember[]>)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Executive Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Supervisor Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Team Size</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supervisors.map((supervisor) => (
                <TableRow key={supervisor.id}>
                  <TableCell className="font-medium">
                    {supervisor.firstName} {supervisor.lastName}
                  </TableCell>
                  <TableCell>{supervisor.department || 'N/A'}</TableCell>
                  <TableCell>
                    {teamMembersBySupervisor[supervisor.id]?.length || 0} members
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(supervisor.id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers
                .filter(member => member.role === 'team_member')
                .map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.firstName} {member.lastName}
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>{member.department || 'N/A'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(member.id)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

