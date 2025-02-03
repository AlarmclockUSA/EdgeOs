'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { withRoleAccess } from '@/lib/with-role-access'
import { Copy, Check } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FirebaseError } from 'firebase/app'

interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  supervisorId?: string;
  companyName?: string;
}

interface Updates {
  role?: string;
  supervisorId?: string;
  [key: string]: any;
}

function CompanySettings() {
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [supervisors, setSupervisors] = useState<CompanyUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({})
  const [batchRole, setBatchRole] = useState('')
  const [batchSupervisor, setBatchSupervisor] = useState('')
  const [selectedRole, setSelectedRole] = useState<'team_member' | 'supervisor'>('team_member')
  const { user, companyName: authCompanyName } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (authCompanyName && db) {
        const companyRef = doc(db as Firestore, 'companies', authCompanyName)
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

    if (!authCompanyName || !db) {
      setError('Company not found')
      return
    }

    try {
      const companyRef = doc(db as Firestore, 'companies', authCompanyName)
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
    if (!authCompanyName || !db) {
      setError('Company information not available')
      return
    }

    try {
      const usersRef = collection(db as Firestore, 'users')
      const q = query(usersRef, where('companyName', '==', authCompanyName))
      const querySnapshot = await getDocs(q)
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CompanyUser[]
      setUsers(fetchedUsers)
      setSupervisors(fetchedUsers.filter(user => user.role === 'supervisor' || user.role === 'executive'))
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to fetch users')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [authCompanyName])

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!db) return;
    
    try {
      const userRef = doc(db as Firestore, 'users', userId)
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
      if (error instanceof FirebaseError && error.code === "permission-denied") {
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
    if (!db) return;
    
    try {
      const userRef = doc(db as Firestore, 'users', userId)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data() as CompanyUser | undefined

      if (!userData) {
        toast({
          title: "Error",
          description: "User data not found.",
          variant: "destructive",
        })
        return
      }

      if (userData.role === 'executive') {
        toast({
          title: "Action Not Allowed",
          description: "Executives cannot be assigned supervisors.",
          variant: "destructive",
        })
        return
      }

      // Convert 'none' value to empty string for storage
      const supervisorIdToStore = newSupervisorId === 'none' ? '' : newSupervisorId

      await updateDoc(userRef, { supervisorId: supervisorIdToStore })
      toast({
        title: "Supervisor Updated",
        description: supervisorIdToStore ? "User has been assigned to a supervisor." : "Supervisor has been removed.",
      })
      fetchUsers()
    } catch (error) {
      console.error('Error updating supervisor:', error)
      toast({
        title: "Error",
        description: "Failed to update supervisor. Please try again.",
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
      const newSelected: Record<string, boolean> = {}
      users.forEach(user => {
        newSelected[user.id] = true
      })
      setSelectedUsers(newSelected)
    }
  }

  const handleBatchUpdate = async () => {
    if (!db) return;
    
    const selectedUserIds = Object.keys(selectedUsers).filter(id => selectedUsers[id])
    if (selectedUserIds.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to update.",
        variant: "destructive",
      })
      return
    }

    const batch = writeBatch(db as Firestore)
    selectedUserIds.forEach(userId => {
      const userRef = doc(db as Firestore, 'users', userId)
      const updates: Updates = {}
      if (batchRole) {
        updates.role = batchRole
      }
      if (batchSupervisor && batchRole !== 'supervisor' && batchRole !== 'executive') {
        updates.supervisorId = batchSupervisor
      }
      batch.update(userRef, updates)
    })

    try {
      await batch.commit()
      toast({
        title: "Batch Update Successful",
        description: "Selected users have been updated.",
      })
      fetchUsers()
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

  const teamMemberLink = authCompanyName ? `${window.location.origin}/join/team?company=${encodeURIComponent(authCompanyName)}` : ''
  const supervisorLink = authCompanyName ? `${window.location.origin}/join/supervisor?company=${encodeURIComponent(authCompanyName)}` : ''

  return (
    <div className="pt-8">
      <Card className="bg-white rounded-none border-0">
        <CardHeader>
          <CardTitle className="text-[#333333]">Company Settings</CardTitle>
          <p className="text-[#666666] mt-1.5">
            Manage your company information and access settings.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateCompany} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-[#333333]">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="bg-white text-[#333333] border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySize" className="text-[#333333]">Company Size</Label>
              <Input
                id="companySize"
                type="number"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                required
                className="bg-white text-[#333333] border-gray-200"
              />
            </div>
            <Button 
              type="submit" 
              className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
              variant="outline"
            >
              Update Company
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-none border-0 mt-8">
        <CardHeader>
          <CardTitle className="text-[#333333]">Invite Links</CardTitle>
          <p className="text-[#666666] mt-1.5">
            Generate and manage invite links for team members and supervisors.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[#333333]">Team Member Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={teamMemberLink}
                readOnly
                className="bg-white text-[#333333] border-gray-200 flex-1"
              />
              <Button
                onClick={() => handleCopyLink(teamMemberLink)}
                variant="outline"
                className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#333333]">Supervisor Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={supervisorLink}
                readOnly
                className="bg-white text-[#333333] border-gray-200 flex-1"
              />
              <Button
                onClick={() => handleCopyLink(supervisorLink)}
                variant="outline"
                className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
              >
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-none border-0 mt-8">
        <CardHeader>
          <CardTitle className="text-[#333333]">User Management</CardTitle>
          <p className="text-[#666666] mt-1.5">
            Manage user roles and supervisor assignments.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Select value={batchRole} onValueChange={setBatchRole}>
                <SelectTrigger className="w-[200px] bg-white text-[#333333] border-gray-200">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={batchSupervisor} onValueChange={setBatchSupervisor}>
                <SelectTrigger className="w-[200px] bg-white text-[#333333] border-gray-200">
                  <SelectValue placeholder="Select supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map(supervisor => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.firstName} {supervisor.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleBatchUpdate}
                variant="outline"
                className="bg-white text-[#333333] border-gray-200 hover:bg-gray-50"
              >
                Update Selected
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={users.length > 0 && users.every(user => selectedUsers[user.id])}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-[#333333]">Name</TableHead>
                  <TableHead className="text-[#333333]">Role</TableHead>
                  <TableHead className="text-[#333333]">Supervisor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} className="border-gray-200">
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers[user.id] || false}
                        onCheckedChange={() => handleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell className="text-[#333333] font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                        <SelectTrigger className="w-[140px] bg-white text-[#333333] border-gray-200">
                          <SelectValue>{user.role}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="team_member">Team Member</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={user.supervisorId || 'none'} 
                        onValueChange={(value) => handleSupervisorChange(user.id, value)}
                        disabled={user.role === 'executive'}
                      >
                        <SelectTrigger className="w-[200px] bg-white text-[#333333] border-gray-200">
                          <SelectValue>
                            {(() => {
                              const supervisor = supervisors.find(s => s.id === user.supervisorId)
                              return supervisor 
                                ? `${supervisor.firstName} ${supervisor.lastName}`
                                : 'No supervisor'
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No supervisor</SelectItem>
                          {supervisors.map(supervisor => (
                            <SelectItem key={supervisor.id} value={supervisor.id}>
                              {supervisor.firstName} {supervisor.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withRoleAccess(CompanySettings, ['executive'])

