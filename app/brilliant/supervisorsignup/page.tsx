'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { setDoc, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function SupervisorSignup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [error, setError] = useState('')
  const [companyName, setCompanyName] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkId = searchParams.get('linkId')

  useEffect(() => {
    const fetchCompanyName = async () => {
      if (linkId) {
        const companiesRef = collection(db, 'companies')
        const q = query(companiesRef, where('inviteLinks.supervisor.linkId', '==', linkId))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          setCompanyName(querySnapshot.docs[0].id)
        } else {
          setError('Invalid or expired invite link')
        }
      }
    }
    fetchCompanyName()
  }, [linkId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!linkId || !companyName) {
      setError('Invalid invite link')
      return
    }
    try {
      const companyRef = doc(db, 'companies', companyName)
      const companyDoc = await getDoc(companyRef)
      if (!companyDoc.exists()) {
        setError('Company not found')
        return
      }
      const companyData = companyDoc.data()
      if (companyData.supervisorPassword !== supervisorPassword) {
        setError('Invalid supervisor password')
        return
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName,
        lastName,
        email,
        role: 'supervisor',
        companyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to create an account')
      console.error(err)
    }
  }

  if (!companyName) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Supervisor Signup for {companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisorPassword">Supervisor Password</Label>
              <Input
                id="supervisorPassword"
                type="password"
                value={supervisorPassword}
                onChange={(e) => setSupervisorPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit" className="w-full">
              Sign Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

