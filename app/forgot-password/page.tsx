'use client'

import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsSubmitting(true)

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err) {
      setError('Failed to send password reset email. Please check your email address and try again.')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1E1E1E]">
      <div className="w-[400px]">
        <Card className="bg-card border-none shadow-2xl">
          <CardHeader className="space-y-2 flex flex-col items-center pt-8 pb-4">
            <h1 className="text-[32px] font-semibold text-white tracking-tight">LeaderForge</h1>
            <CardTitle className="text-white text-xl">Reset Password</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                    className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full bg-[#F5A524] text-white hover:bg-[#F5A524]/90 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-500/10 text-green-500 px-4 py-3 rounded-md text-sm">
                  Password reset email sent. Please check your inbox and follow the instructions.
                </div>
                <Button 
                  type="button" 
                  className="w-full bg-[#F5A524] text-white hover:bg-[#F5A524]/90 transition-colors"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                >
                  Send Another Reset Link
                </Button>
              </div>
            )}
            <div className="mt-8 text-center">
              <Link 
                href="/signin" 
                className="text-muted-foreground hover:text-white transition-colors inline-flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

