'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/lib/auth-context'
import { tribeApiFetch } from '@/lib/tribe-api'

export default function ConnectTribe() {
  const router = useRouter()
  const { user } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Attempt to authenticate with Tribe using provided credentials
      const response = await tribeApiFetch('/auth/connect', {
        method: 'POST',
        body: {
          userId: user?.uid,
          organizationName: orgName,
          password: password
        }
      })

      if (response.success) {
        // Redirect back to the main app
        router.push('/')
      }
    } catch (err) {
      setError('Failed to connect Tribe account. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Tribe Account</CardTitle>
          <CardDescription>
            Please enter your existing Tribe organization details to connect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="orgName" className="text-sm font-medium">
                Organization Name
              </label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your Tribe organization name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your Tribe password"
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
              {loading ? 'Connecting...' : 'Connect Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 