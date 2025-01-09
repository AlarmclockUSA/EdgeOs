'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { withRoleAccess } from '@/lib/with-role-access'
import { Copy, Check } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

function CompanySettings() {
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [users, setUsers] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [selectedUsers, setSelectedUsers] = useState({})
  const [batchRole, setBatchRole] = useState('')
  const [batchSupervisor, setBatchSupervisor] = useState('')
  const [selectedRole, setSelectedRole] = useState<'team_member' | 'supervisor'>('team_member')
  const { user, companyName: authCompanyName } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (authCompanyName) {
        const companyRef = doc(db, 'companies', authCompanyName)
        const companyDoc = await getDoc(companyRef)
        if (companyDoc.exists()) {
          const data = companyDoc.data()
          setCompanyName(data.name)
          setCompanySize(data.size.toString())
          setSupervisorPassword(data.supervisorPassword || '')
        }
      }
    }
    fetchCompanyData()
  }, [authCompanyName])

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!authCompanyName) {
      setError('Company not found')
      return
    }

    try {
      const companyRef = doc(db, 'companies', authCompanyName)
      await updateDoc(companyRef, {
        name: companyName,
        size: parseInt(companySize),
        updatedAt: new Date().toISOString()
      })
      setSuccess('Company information updated successfully')
    } catch (err) {
      setError('Failed to update company information')
      console.error(err)
    }
  }

  const fetchUsers = async () => {
    if (authCompanyName) {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('companyName', '==', authCompanyName))
      const querySnapshot = await getDocs(q)
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setUsers(fetchedUsers)
      setSupervisors(fetchedUsers.filter(user => user.role === 'supervisor' || user.role === 'executive'))
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [authCompanyName])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()
      
      await updateDoc(userRef, { role: newRole })
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      })
      fetchUsers() // Refresh the user list
    } catch (error) {
      console.error('Error updating user role:', error)
      if (error instanceof Error && error.name === "FirebaseError" && error.code === "permission-denied") {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to update user roles. Please contact your system administrator.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update user role. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleSupervisorChange = async (userId: string, newSupervisorId: string) => {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()

      if (userData.role === 'executive') {
        toast({
          title: "Action Not Allowed",
          description: "Executives cannot be assigned supervisors.",
          variant: "destructive",
        })
        return
      }

      await updateDoc(userRef, { supervisorId: newSupervisorId })
      toast({
        title: "Supervisor Assigned",
        description: "User has been successfully assigned to a supervisor.",
      })
      fetchUsers() // Refresh the user list
    } catch (error) {
      console.error('Error assigning supervisor:', error)
      toast({
        title: "Error",
        description: "Failed to assign supervisor. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const handleSelectAll = () => {
    const allSelected = users.every(user => selectedUsers[user.id])
    if (allSelected) {
      setSelectedUsers({})
    } else {
      const newSelected = {}
      users.forEach(user => {
        newSelected[user.id] = true
      })
      setSelectedUsers(newSelected)
    }
  }

  const handleBatchUpdate = async () => {
    const selectedUserIds = Object.keys(selectedUsers).filter(id => selectedUsers[id])
    if (selectedUserIds.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to update.",
        variant: "destructive",
      })
      return
    }

    const batch = writeBatch(db)
    selectedUserIds.forEach(userId => {
      const userRef = doc(db, 'users', userId)
      const updates = {}
      if (batchRole) {
        updates['role'] = batchRole
      }
      if (batchSupervisor && batchRole !== 'supervisor' && batchRole !== 'executive') {
        updates['supervisorId'] = batchSupervisor
      }
      batch.update(userRef, updates)
    })

    try {
      await batch.commit()
      toast({
        title: "Batch Update Successful",
        description: "Selected users have been updated.",
      })
      fetchUsers() // Refresh the user list
      setSelectedUsers({})
      setBatchRole('')
      setBatchSupervisor('')
    } catch (error) {
      console.error('Error in batch update:', error)
      toast({
        title: "Error",
        description: "Failed to update users. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Company Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Update Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateCompany} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size</Label>
              <Input
                id="companySize"
                type="number"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Update Company</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
  <CardHeader>
    <CardTitle>Signup Links</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="mb-4">Share these links to allow team members and supervisors to sign up:</p>
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Select defaultValue="team_member" onValueChange={(value) => setSelectedRole(value as 'team_member' | 'supervisor')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="team_member">Team Member</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={`${process.env.NEXT_PUBLIC_BASE_URL}/brilliant/${selectedRole === 'supervisor' ? 'supervisorsignup' : 'teamsignup'}`}
          readOnly
        />
        <Button
          onClick={() => {
            const link = `${process.env.NEXT_PUBLIC_BASE_URL}/brilliant/${selectedRole === 'supervisor' ? 'supervisorsignup' : 'teamsignup'}`;
            navigator.clipboard.writeText(link);
            toast({
              title: "Link Copied",
              description: `The ${selectedRole} signup link has been copied to your clipboard.`,
            });
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  </CardContent>
</Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            To designate a user as a supervisor, change their role to "Supervisor" using the dropdown menu in the "Role" column.
          </p>
          <div className="mb-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Select value={batchRole} onValueChange={setBatchRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select batch role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={batchSupervisor} onValueChange={setBatchSupervisor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select batch supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.firstName} {supervisor.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleBatchUpdate}>Update Selected</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={users.length > 0 && users.every(user => selectedUsers[user.id])}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Supervisor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers[user.id] || false}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.role !== 'executive' ? (
                      <Select
                        value={user.supervisorId || ''}
                        onValueChange={(newSupervisorId) => handleSupervisorChange(user.id, newSupervisorId)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Assign supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors.filter(supervisor => supervisor.id !== user.id).map((supervisor) => (
                            <SelectItem key={supervisor.id} value={supervisor.id}>
                              {supervisor.firstName} {supervisor.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      {success && <p className="text-green-500 mt-4">{success}</p>}
    </div>
  )
}

export default withRoleAccess(CompanySettings, ['executive'])

