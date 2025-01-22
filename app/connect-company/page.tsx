'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { doc, setDoc, Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function ConnectCompany() {
  const [companyCode, setCompanyCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    try {
      // Here you would verify the company code
      // For now, we'll just connect the user to the company
      await setDoc(doc(db as Firestore, 'users', user.uid), {
        companyCode,
        role: 'member',
        updatedAt: new Date().toISOString()
      }, { merge: true })

      // Redirect to dashboard
      router.push('/')
    } catch (err) {
      console.error('Error connecting to company:', err)
      setError('Invalid company code')
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
          <CardTitle className="text-black">Connect to Company</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter Company Code"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                required
                className="rounded-md bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none text-gray-900"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button 
              type="submit" 
              className="w-full text-white hover:opacity-90 transition-opacity bg-gradient-to-r from-[#55763F] to-[#DD941C]"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect to Company'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 