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
import Image from 'next/image'

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
    <div 
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('https://rzdccuvdljw6vbd9.public.blob.vercel-storage.com/Brilliant%20Gradient%20Pack-08-o0UBIWfn04dBV1myh1cHrj8dV5SWSN.jpeg')"
      }}
    >
      <Card className="w-[350px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-none">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <Image
            src="https://rzdccuvdljw6vbd9.public.blob.vercel-storage.com/Brilliant_Full-Color_Dark-PJL01DbB696sC0Y9S5uyi9Q8l6vhI2.png"
            alt="Brilliant OS Logo"
            width={200}
            height={100}
            priority
          />
          <CardTitle className="text-black">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none text-gray-900 autofill:bg-white autofill:shadow-[inset_0_0_0px_1000px_white]"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-md bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none text-gray-900 autofill:bg-white autofill:shadow-[inset_0_0_0px_1000px_white]"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button 
              type="submit" 
              className="w-full text-white hover:opacity-90 transition-opacity bg-gradient-to-r from-[#55763F] to-[#DD941C]"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm">
              <Link href="/forgot-password" className="text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </p>
            <div className="flex flex-col space-y-2">
              <p className="text-sm">
                <Link href="/join-company" className="text-blue-600 hover:underline flex items-center justify-center">
                  Join a Company <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </p>
              <p className="text-sm">
                <Link href="/company-setup" className="text-blue-600 hover:underline flex items-center justify-center">
                  Create a Company <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

