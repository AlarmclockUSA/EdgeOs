'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Supervisor {
  id: string
  name: string
  currentBoldAction: string
  currentTraining: string
  department: string
  needsFollowUp: boolean
  isDirectReport: boolean
}

export default function ExecutiveDashboard() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const { user, userRole, companyName } = useAuth()
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

    const fetchSupervisors = async () => {
      setLoading(true)
      setError(null)
      try {
        const usersRef = collection(db, 'users')
        const q = query(
          usersRef, 
          where('companyName', '==', companyName),
          where('role', 'in', ['supervisor', 'executive'])
        )
        const querySnapshot = await getDocs(q)
        const supervisorsData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: `${data.firstName} ${data.lastName}`,
            currentBoldAction: data.currentBoldAction || 'No current action',
            currentTraining: data.currentTraining || 'No current training',
            department: data.department || 'N/A',
            needsFollowUp: data.activeBoldActions > 0 || data.overallProgress < 90,
            isDirectReport: data.supervisorId === user?.uid
          }
        })
        setSupervisors(supervisorsData)
      } catch (err) {
        console.error('Error fetching supervisors:', err)
        setError('Failed to fetch supervisors. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchSupervisors()
  }, [userRole, router, companyName, user])

  const filteredSupervisors = supervisors.filter(supervisor => 
    (activeTab === 'all' || (activeTab === 'direct' && supervisor.isDirectReport)) &&
    (supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supervisor.currentBoldAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supervisor.currentTraining.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Executive Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Supervisor Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Supervisors</TabsTrigger>
              <TabsTrigger value="direct">Direct Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <SupervisorTable 
                supervisors={filteredSupervisors} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                router={router}
              />
            </TabsContent>
            <TabsContent value="direct">
              <SupervisorTable 
                supervisors={filteredSupervisors} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                router={router}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function SupervisorTable({ supervisors, searchTerm, setSearchTerm, router }) {
  return (
    <>
      <Input
        type="text"
        placeholder="Search supervisors..."
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
              <TableHead>Current Training</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supervisors.map((supervisor) => (
              <TableRow key={supervisor.id}>
                <TableCell>{supervisor.name}</TableCell>
                <TableCell>{supervisor.currentBoldAction}</TableCell>
                <TableCell>{supervisor.currentTraining}</TableCell>
                <TableCell>{supervisor.department}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => router.push(`/supervisor-details/${supervisor.id}`)}
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
    </>
  )
}

