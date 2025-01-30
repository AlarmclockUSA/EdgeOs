'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, Firestore } from 'firebase/firestore'
import { updateEmail, updatePassword } from 'firebase/auth'
import { useAuth } from '@/lib/auth-context'
import { db, auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { VirtualMeetingSettings } from '@/components/settings/virtual-meeting-settings'

export default function Account() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'executive'

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    } else if (user) {
      const fetchUserData = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setFirstName(userData.firstName || '')
          setLastName(userData.lastName || '')
          setEmail(user.email || '')
        }
      }
      fetchUserData()
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!user || !db) {
      setError('User not found')
      return
    }

    try {
      const userRef = doc(db as Firestore, 'users', user.uid)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()

      if (userData?.email !== email) {
        const emailRef = doc(db as Firestore, 'emails', email)
        const emailDoc = await getDoc(emailRef)
        if (emailDoc.exists()) {
          setError('Email already in use')
          return
        }

        if (userData?.email) {
          const oldEmailRef = doc(db as Firestore, 'emails', userData.email)
          await updateDoc(oldEmailRef, { userId: null })
        }

        await updateDoc(doc(db as Firestore, 'users', user.uid), { email })
      }

      if (newPassword) {
        await updatePassword(user, newPassword)
      }

      await updateDoc(doc(db as Firestore, 'users', user.uid), {
        firstName,
        lastName,
        updatedAt: new Date().toISOString()
      })

      setSuccess('Profile updated successfully')
    } catch (err) {
      setError('Failed to update profile')
      console.error(err)
    }
  }

  if (loading || !user) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-md mx-auto bg-white">
        <CardHeader>
          <CardTitle className="text-black">Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="firstName" className="text-black">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-white text-black border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-black">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-white text-black border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-black">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-black border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-black">New Password (optional)</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white text-black border-gray-200"
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            {success && <p className="text-green-600">{success}</p>}
            <Button type="submit" className="w-full bg-white text-black border border-gray-200 hover:bg-gray-50 hover:text-black">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Virtual Meeting Settings for Supervisors and Executives */}
      {isSupervisor && (
        <Card className="max-w-md mx-auto bg-white">
          <CardHeader>
            <CardTitle className="text-black">Virtual Meeting Settings</CardTitle>
            <CardDescription>
              Set up your default meeting room for 5-minute stand ups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VirtualMeetingSettings />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

