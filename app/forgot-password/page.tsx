'use client'

import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err) {
      setError('Failed to send password reset email')
      console.error(err)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500">{error}</p>}
              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <p className="text-green-500">Password reset email sent. Check your inbox.</p>
          )}
          <p className="mt-4 text-center text-sm">
            <Link href="/signin" className="text-primary hover:underline">
              Back to Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

