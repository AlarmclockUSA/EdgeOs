'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/lib/auth-context'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface JoinCompanyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinCompanyModal({ isOpen, onClose }: JoinCompanyModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [companyCode, setCompanyCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Verify company code and join company
      const response = await fetch('/api/companies/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          companyCode
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update user's company association
        await updateDoc(doc(db, 'users', user!.uid), {
          companyId: data.companyId,
          companyName: data.companyName,
          role: 'team_member' // Default role for new joiners
        })

        onClose()
        router.push('/dashboard') // Or wherever you want to redirect after joining
      } else {
        setError(data.error || 'Failed to join company')
      }
    } catch (err) {
      setError('Failed to join company. Please check the company code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join Existing Company</DialogTitle>
          <DialogDescription>
            Enter the company code provided by your administrator to join an existing company.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="companyCode" className="text-sm font-medium">
              Company Code
            </label>
            <Input
              id="companyCode"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="Enter company code"
              required
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Company'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 