'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword, Auth } from 'firebase/auth'
import { auth as firebaseAuth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(firebaseAuth as Auth, email, password)
      router.push('/')
    } catch (err) {
      console.error('Sign in error:', err)
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1E1E1E]">
      <div className="w-[400px]">
        <Card className="bg-card border-none shadow-2xl">
          <CardHeader className="space-y-2 flex flex-col items-center pt-8 pb-4">
            <h1 className="text-[32px] font-semibold text-white tracking-tight">LeaderForge</h1>
            <CardTitle className="text-white text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button 
                type="submit" 
                className="w-full bg-[#F5A524] text-white hover:bg-[#F5A524]/90 transition-colors"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-8 text-center space-y-6">
              <p className="text-sm">
                <Link href="/forgot-password" className="text-muted-foreground hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </p>
              <div className="flex flex-col space-y-4">
                <p className="text-sm">
                  <Link href="/company-setup" className="text-muted-foreground hover:text-white transition-colors flex items-center justify-center">
                    Create a Company <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

