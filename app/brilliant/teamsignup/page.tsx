'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { setDoc, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"

export default function TeamSignup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyPassword, setCompanyPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showCompanyPassword, setShowCompanyPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // Verify company and password
      const companyRef = doc(db, 'companies', companyName)
      const companyDoc = await getDoc(companyRef)
      
      if (!companyDoc.exists()) {
        setError('Company not found')
        setIsSubmitting(false)
        return
      }

      if (companyDoc.data().companyPassword !== companyPassword) {
        setError('Invalid company password')
        setIsSubmitting(false)
        return
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create user document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName,
        lastName,
        email,
        role: 'team_member',
        companyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      toast({
        title: "Account Created",
        description: "Your account has been created successfully. Redirecting to dashboard...",
      })

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)

    } catch (error) {
      console.error('Error creating account:', error)
      if (error instanceof Error) {
        if (error.message.includes('auth/email-already-in-use')) {
          setError('This email is already in use')
        } else if (error.message.includes('auth/invalid-email')) {
          setError('Please enter a valid email address')
        } else if (error.message.includes('auth/weak-password')) {
          setError('Password should be at least 6 characters')
        } else {
          setError('Failed to create account. Please try again.')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Join Your Team</CardTitle>
          <CardDescription>
            Create your team member account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="First Name"
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
                placeholder="Last Name"
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
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPassword">Company Password</Label>
              <div className="relative">
                <Input
                  id="companyPassword"
                  type={showCompanyPassword ? "text" : "password"}
                  placeholder="Enter company password"
                  value={companyPassword}
                  onChange={(e) => setCompanyPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowCompanyPassword(!showCompanyPassword)}
                >
                  {showCompanyPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

