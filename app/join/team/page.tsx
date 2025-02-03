'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { setDoc, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import { LoadingScreen } from '@/components/loading-screen'

export default function TeamSignup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyCompany = async () => {
      const company = searchParams.get('company')
      if (!company) {
        setError('Invalid signup link. Please contact your company administrator.')
        setLoading(false)
        return
      }

      try {
        const decodedCompany = decodeURIComponent(company)
        const companyRef = doc(db, 'companies', decodedCompany)
        const companyDoc = await getDoc(companyRef)
        
        if (!companyDoc.exists()) {
          setError('Company not found. Please contact your company administrator.')
          setLoading(false)
          return
        }

        setCompanyName(decodedCompany)
        setLoading(false)
      } catch (error) {
        console.error('Error verifying company:', error)
        setError('Failed to verify company. Please try again.')
        setLoading(false)
      }
    }

    verifyCompany()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (isSubmitting || !companyName) return
    setIsSubmitting(true)

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create user document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName,
        lastName,
        email,
        role: 'team_member',
        companyName,
        supervisorId: '', // Empty until assigned by executive
        permissions: ['team_member'], // Base permissions for team member
        trainingProgress: {
          lastUpdated: new Date().toISOString(),
          completedVideos: 0,
          totalVideos: 0,
          progress: 0
        },
        lastActive: new Date().toISOString(),
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

  if (loading) {
    return <LoadingScreen />
  }

  if (!companyName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Invalid Signup Link</CardTitle>
            <CardDescription>
              This signup link is invalid or has expired. Please contact your company administrator for a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/signin')} className="w-full">
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1E1E1E] p-4">
      <div className="w-full max-w-[500px]">
        <Card className="bg-card border-none shadow-2xl">
          <CardHeader className="space-y-2 pt-6 pb-4">
            <h1 className="text-[28px] font-semibold text-white tracking-tight text-center">LeaderForge</h1>
            <CardTitle className="text-white text-xl">Join {companyName}</CardTitle>
            <CardDescription className="text-white/70">
              Create your team member account to get started with LeaderForge.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-white">First Name</Label>
                <p className="text-sm text-white/70">Enter your first name as it appears in company records.</p>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-white">Last Name</Label>
                <p className="text-sm text-white/70">Enter your last name as it appears in company records.</p>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white">Email</Label>
                <p className="text-sm text-white/70">Use your company email address to sign up.</p>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white">Password</Label>
                <p className="text-sm text-white/70">Choose a strong password with at least 8 characters.</p>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-white/70" />
                    ) : (
                      <Eye className="h-4 w-4 text-white/70" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/signin')}
                  className="border-muted-foreground/20 hover:bg-background/80 text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#F5A524] text-white hover:bg-[#F5A524]/90 transition-colors relative"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="opacity-0">Create Account</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 