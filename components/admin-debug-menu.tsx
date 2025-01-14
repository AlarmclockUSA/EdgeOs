'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

const departments = ['Engineering', 'Marketing', 'Sales', 'Customer Support', 'Human Resources']
const roles = ['team_member', 'supervisor', 'executive']
const trainingTopics = ['Leadership Skills', 'Communication', 'Time Management', 'Project Management', 'Customer Service']

const AdminDebugMenu: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [yearsWithCompany, setYearsWithCompany] = useState('')
  const [currentBoldAction, setCurrentBoldAction] = useState('')
  const [currentTraining, setCurrentTraining] = useState('')
  const [completedTrainings, setCompletedTrainings] = useState('')
  const [completedBoldActions, setCompletedBoldActions] = useState('')
  const [teamSize, setTeamSize] = useState('')

  const createNewUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const userData = {
        firstName,
        lastName,
        email,
        role,
        department,
        yearsWithCompany: Number(yearsWithCompany),
        currentBoldAction,
        currentTraining,
        completedTrainings: Number(completedTrainings),
        completedBoldActions: Number(completedBoldActions),
        createdAt: new Date(),
        ...(role === 'supervisor' ? { teamSize: Number(teamSize) } : {}),
      }

      await setDoc(doc(db, 'users', user.uid), userData)
      console.log('User created successfully')
      // Reset form fields after successful creation
      setEmail('')
      setPassword('')
      setFirstName('')
      setLastName('')
      setRole('')
      setDepartment('')
      setYearsWithCompany('')
      setCurrentBoldAction('')
      setCurrentTraining('')
      setCompletedTrainings('')
      setCompletedBoldActions('')
      setTeamSize('')
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const generateRandomData = () => {
    setEmail(`user${Math.floor(Math.random() * 1000)}@example.com`)
    setPassword('password123')
    setFirstName(['John', 'Emma', 'Liam', 'Olivia', 'Noah'][Math.floor(Math.random() * 5)])
    setLastName(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][Math.floor(Math.random() * 5)])
    setRole(roles[Math.floor(Math.random() * roles.length)])
    setDepartment(departments[Math.floor(Math.random() * departments.length)])
    setYearsWithCompany(String(Math.floor(Math.random() * 10) + 1))
    setCurrentBoldAction(Math.random() > 0.3 ? `Implement ${trainingTopics[Math.floor(Math.random() * trainingTopics.length)]} workshop` : '')
    setCurrentTraining(Math.random() > 0.2 ? trainingTopics[Math.floor(Math.random() * trainingTopics.length)] : '')
    setCompletedTrainings(String(Math.floor(Math.random() * 5)))
    setCompletedBoldActions(String(Math.floor(Math.random() * 8)))
    setTeamSize(String(Math.floor(Math.random() * 5) + 3))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Admin Debug Menu</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin Debug Menu</DialogTitle>
          <DialogDescription>
            Create new users and manage the application.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="create-user" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create-user">Create User</TabsTrigger>
            <TabsTrigger value="manage-app">Manage App</TabsTrigger>
          </TabsList>
          <div className="pt-4 pb-2">
            <TabsContent value="create-user">
              <form onSubmit={createNewUser} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="yearsWithCompany">Years with Company</Label>
                  <Input
                    type="number"
                    id="yearsWithCompany"
                    value={yearsWithCompany}
                    onChange={(e) => setYearsWithCompany(e.target.value)}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5" style={{ display: role === 'supervisor' ? 'grid' : 'none' }}>
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    type="number"
                    id="teamSize"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="currentBoldAction">Current Bold Action</Label>
                  <Input
                    type="text"
                    id="currentBoldAction"
                    value={currentBoldAction}
                    onChange={(e) => setCurrentBoldAction(e.target.value)}
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="currentTraining">Current Training</Label>
                  <Input
                    type="text"
                    id="currentTraining"
                    value={currentTraining}
                    onChange={(e) => setCurrentTraining(e.target.value)}
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="completedTrainings">Completed Trainings</Label>
                  <Input
                    type="number"
                    id="completedTrainings"
                    value={completedTrainings}
                    onChange={(e) => setCompletedTrainings(e.target.value)}
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="completedBoldActions">Completed Bold Actions</Label>
                  <Input
                    type="number"
                    id="completedBoldActions"
                    value={completedBoldActions}
                    onChange={(e) => setCompletedBoldActions(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Create User</Button>
              </form>
              <Button onClick={generateRandomData} className="w-full mt-4">Generate Random Data</Button>
            </TabsContent>
            <TabsContent value="manage-app">
              <p>App management features will be added here in the future.</p>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export { AdminDebugMenu }

