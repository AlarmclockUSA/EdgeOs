'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, Firestore } from 'firebase/firestore'
import { updateEmail, updatePassword } from 'firebase/auth'
import { useAuth } from '@/lib/auth-context'
import { db, auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && db) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setFirstName(userData.firstName || '')
          setLastName(userData.lastName || '')
          setEmail(user.email || '')
        }
      }
    }
    if (isOpen) {
      fetchUserData()
    }
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!user || !db) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      })
      setIsLoading(false)
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
          toast({
            title: "Error",
            description: "Email already in use",
            variant: "destructive",
          })
          setIsLoading(false)
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

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
      onClose()
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#333333]">Account Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-[#333333]">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-white text-[#333333] border-gray-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-[#333333]">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-white text-[#333333] border-gray-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#333333]">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white text-[#333333] border-gray-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-[#333333]">New Password (optional)</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white text-[#333333] border-gray-200"
            />
          </div>
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="bg-white text-[#333333] border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-white text-[#333333] border border-gray-200 hover:bg-gray-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 