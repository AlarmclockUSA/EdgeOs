'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/lib/auth-context'
import { doc, updateDoc, getDoc, Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function JoinCompanyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [companyPassword, setCompanyPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!user || !db) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      // Verify company and password
      const companyRef = doc(db as Firestore, 'companies', companyName)
      const companyDoc = await getDoc(companyRef)

      if (!companyDoc.exists()) {
        setError('Company not found')
        return
      }

      if (companyDoc.data().companyPassword !== companyPassword) {
        setError('Invalid company password')
        return
      }

      // Update user's company association
      await updateDoc(doc(db as Firestore, 'users', user.uid), {
        companyName: companyName,
        role: 'team_member', // Default role for new joiners
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      router.push('/dashboard')
    } catch (err) {
      setError('Failed to join company. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Join a Brilliant OS Company</CardTitle>
          <CardDescription>
            Enter your company name and password to join an existing Brilliant OS company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium">
                Company Name
              </label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="companyPassword" className="text-sm font-medium">
                Company Password
              </label>
              <Input
                id="companyPassword"
                type="password"
                value={companyPassword}
                onChange={(e) => setCompanyPassword(e.target.value)}
                placeholder="Enter company password"
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <Button 
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Company'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 