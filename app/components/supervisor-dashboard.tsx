'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StyledCard } from '@/components/StyledCard'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Firestore } from 'firebase/firestore'
import { toast } from "@/components/ui/use-toast"
import { CardContent } from "@/components/ui/card"

interface TeamMember {
  id: string
  name: string
  currentBoldAction: string
  currentTraining: string
  role: string
  department: string
  yearsWithCompany: number
}

export default function SupervisorDashboard() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { user, userRole, companyName } = useAuth()
  const router = useRouter()

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
      setLoading(true)
      setError(null)
      try {
        const usersRef = collection(db as Firestore, 'users')
        const q = query(
          usersRef, 
          where('companyName', '==', companyName),
          where('supervisorId', '==', user?.uid)
        )
        const querySnapshot = await getDocs(q)
        const teamMembersData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: `${data.firstName} ${data.lastName}`,
            currentBoldAction: data.currentBoldAction || 'No current action',
            currentTraining: data.currentTraining || 'No current training',
            role: data.role || 'Team Member',
            department: data.department || 'N/A',
            yearsWithCompany: data.yearsWithCompany || 0,
          }
        })
        setTeamMembers(teamMembersData)
      } catch (err) {
        console.error('Error fetching team members:', err)
        setError('Failed to fetch team members. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [userRole, router, companyName])

  const filteredTeamMembers = teamMembers.filter(member => 
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-black">Supervisor Dashboard</h1>
      
      <StyledCard title="Team Member Overview">
        <CardContent>
          <Input
            type="text"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 bg-white text-black border-gray-200"
          />
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black">Name</TableHead>
                  <TableHead className="text-black">Current Bold Action</TableHead>
                  <TableHead className="text-black">Current Training</TableHead>
                  <TableHead className="text-black">Department</TableHead>
                  <TableHead className="text-black">Years with Company</TableHead>
                  <TableHead className="text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="text-black">{member.name}</TableCell>
                    <TableCell className="text-black">{member.currentBoldAction}</TableCell>
                    <TableCell className="text-black">{member.currentTraining}</TableCell>
                    <TableCell className="text-black">{member.department}</TableCell>
                    <TableCell className="text-black">{member.yearsWithCompany}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => router.push(`/user-details/${member.id}`)}
                        variant="outline"
                        size="sm"
                        className="bg-white text-black border border-gray-200 hover:bg-gray-50 hover:text-black"
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
      </StyledCard>
    </div>
  )
}

