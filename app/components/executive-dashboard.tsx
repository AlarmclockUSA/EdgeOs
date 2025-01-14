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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, Search } from 'lucide-react'

interface User {
  id: string
  name: string
  role: string
  currentBoldAction: string
  currentTraining: string
  department: string
  needsFollowUp: boolean
  isDirectReport: boolean
}

export default function ExecutiveDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
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

    const fetchUsers = async () => {
      setLoading(true)
      setError(null)
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('companyName', '==', companyName))
        const querySnapshot = await getDocs(q)
        const usersData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: `${data.firstName} ${data.lastName}`,
            role: data.role,
            currentBoldAction: data.currentBoldAction || 'No current action',
            currentTraining: data.currentTraining || 'No current training',
            department: data.department || 'N/A',
            needsFollowUp: data.activeBoldActions > 0 || data.overallProgress < 90,
            isDirectReport: data.supervisorId === user?.uid
          }
        })
        setUsers(usersData)
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to fetch users. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [userRole, router, companyName, user])

  const filteredSupervisors = users.filter(user => 
    (activeTab === 'all' || (activeTab === 'direct' && user.isDirectReport)) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.currentBoldAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.currentTraining.toLowerCase().includes(searchTerm.toLowerCase()))
  )


  const modalFilteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(modalSearchTerm.toLowerCase())
  )

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUsers(prev => {
      const isAlreadySelected = prev.some(user => user.id === selectedUser.id)
      if (isAlreadySelected) {
        return prev.filter(user => user.id !== selectedUser.id)
      } else {
        return [...prev, selectedUser]
      }
    })
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-black">Executive Dashboard</h1>
      
      <Card className="bg-white">
        <CardHeader className="border-b">
          <CardTitle className="text-black">Supervisor Overview</CardTitle>
        </CardHeader>
        <CardContent className="bg-white">
          <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black">All Supervisors</TabsTrigger>
              <TabsTrigger value="direct" className="data-[state=active]:bg-white data-[state=active]:text-black">Direct Reports</TabsTrigger>
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
        className="mb-4 bg-white text-black border-gray-200"
      />
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-black">Name</TableHead>
              <TableHead className="text-black">Current Bold Action</TableHead>
              <TableHead className="text-black">Current Training</TableHead>
              <TableHead className="text-black">Department</TableHead>
              <TableHead className="text-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supervisors.map((supervisor) => (
              <TableRow key={supervisor.id} className="hover:bg-gray-50">
                <TableCell className="text-black">{supervisor.name}</TableCell>
                <TableCell className="text-black">{supervisor.currentBoldAction}</TableCell>
                <TableCell className="text-black">{supervisor.currentTraining}</TableCell>
                <TableCell className="text-black">{supervisor.department}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => router.push(`/user-details/${supervisor.id}`)}
                    variant="outline"
                    size="sm"
                    className="bg-white text-black border-gray-200 hover:bg-gray-50"
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

