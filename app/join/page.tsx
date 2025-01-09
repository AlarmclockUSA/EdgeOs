'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { setDoc, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function JoinCompany() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [inviteData, setInviteData] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    const fetchInviteData = async () => {
      if (token) {
        const inviteRef = doc(db, 'invites', token)
        const inviteDoc = await getDoc(inviteRef)
        if (inviteDoc.exists()) {
          setInviteData(inviteDoc.data())
        } else {
          setError('Invalid or expired invite link')
        }
      }
    }
    fetchInviteData()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!inviteData) {
      setError('Invalid invite data')
      return
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName,
        lastName,
        email,
        role: inviteData.role,
        companyName: inviteData.companyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to create an account')
      console.error(err)
    }
  }

  if (error) {
    return <div className="text-center mt-8">{error}</div>
  }

  if (!inviteData) {
    return <div className="text-center mt-8">Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Join {inviteData.companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Join Company
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

