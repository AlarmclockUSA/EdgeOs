'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function SupervisorDashboard() {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return
      
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('supervisorId', '==', user.uid))
        const querySnapshot = await getDocs(q)
        
        const members = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamMember[]
        
        setTeamMembers(members)
      } catch (error) {
        console.error('Error fetching team members:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [user])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Team</h1>
      
      <div className="space-y-6">
        {teamMembers.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg text-gray-600 text-center">
                You don't have any team members yet, speak to your team leader
              </p>
            </CardContent>
          </Card>
        ) : (
          teamMembers.map(member => (
            <Card key={member.id} className="bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium">{member.firstName} {member.lastName}</h3>
                <p className="text-gray-600">{member.email}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 