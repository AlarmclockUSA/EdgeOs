'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface BoldActionModalProps {
  isOpen: boolean
  onClose: () => void
  boldAction: {
    id: string
    action: string
    timeframe: string
    completedAt: Date | { toDate: () => Date } | null
    createdAt: Date | { toDate: () => Date } | null
    status?: string
    actualTimeframe?: string
    reflectionNotes?: string
  } | null
  onComplete: (id: string) => void
}

export function BoldActionModal({ isOpen, onClose, boldAction, onComplete }: BoldActionModalProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [actualTimeframe, setActualTimeframe] = useState<string>(boldAction?.actualTimeframe || '')
  const [reflectionNotes, setReflectionNotes] = useState(boldAction?.reflectionNotes || '')
  const { user } = useAuth()

  if (!boldAction) return null

  const formatDate = (date: Date | { toDate: () => Date } | null) => {
    if (date instanceof Date) {
      return date.toLocaleDateString()
    } else if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString()
    }
    return 'Date not available'
  }

  const handleComplete = async () => {
    if (!user || !boldAction || !actualTimeframe) {
      toast({
        title: "Required Field Missing",
        description: "Please select the actual timeframe to complete this bold action.",
        variant: "destructive",
      })
      return
    }

    setIsCompleting(true)
    try {
      // First update Firestore
      const boldActionRef = doc(db, `users/${user.uid}/boldActions`, boldAction.id)
      const userRef = doc(db, 'users', user.uid)
      
      // Prepare the updates
      const now = new Date()
      const updates = {
        status: 'completed' as const,
        completedAt: now,
        actualTimeframe,
        reflectionNotes: reflectionNotes.trim() || null
      }
      
      // Update both documents atomically
      await Promise.all([
        setDoc(boldActionRef, updates, { merge: true }),
        updateDoc(userRef, {
          completedBoldActions: increment(1)
        })
      ])

      // Call onComplete to update parent state
      onComplete(boldAction.id)
      
      toast({
        title: "Bold Action Completed",
        description: "Your bold action has been marked as completed.",
      })

      // Close modal
      onClose()
    } catch (error) {
      console.error('Error completing bold action:', error)
      toast({
        title: "Error",
        description: "Failed to complete the bold action. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Bold Action Details</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <DialogDescription asChild>
            <div className="space-y-2">
              <p className="text-gray-900">{boldAction.action}</p>
              <p className="text-sm text-gray-600">Expected timeframe: {boldAction.timeframe}</p>
              <p className="text-sm text-gray-600">
                Created on: {formatDate(boldAction.createdAt)}
              </p>
              {boldAction.status === 'completed' && (
                <p className="text-sm text-gray-600">
                  Completed on: {formatDate(boldAction.completedAt)}
                </p>
              )}
            </div>
          </DialogDescription>

          {boldAction.status === 'completed' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-900">Actual Timeframe</Label>
                <p className="text-sm text-gray-900">{boldAction.actualTimeframe}</p>
              </div>
              {boldAction.reflectionNotes && (
                <div className="space-y-2">
                  <Label className="text-gray-900">Reflection Notes</Label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{boldAction.reflectionNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="actualTimeframe" className="text-sm font-medium text-gray-900">
                  Actual Timeframe to Complete
                </Label>
                <Select value={actualTimeframe} onValueChange={setActualTimeframe}>
                  <SelectTrigger id="actualTimeframe" className="bg-white text-gray-900 border-gray-300">
                    <SelectValue placeholder="Select actual timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Less than 1 Week">Less than 1 Week</SelectItem>
                    <SelectItem value="1 Week">1 Week</SelectItem>
                    <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                    <SelectItem value="3 Weeks">3 Weeks</SelectItem>
                    <SelectItem value="4+ Weeks">4+ Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reflectionNotes" className="text-sm font-medium text-gray-900">
                  Reflection Notes (Optional)
                </Label>
                <Textarea
                  id="reflectionNotes"
                  placeholder="Share your thoughts on completing this bold action..."
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  className="min-h-[100px] bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onClose} className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50">
            Close
          </Button>
          {boldAction.status === 'active' && (
            <Button 
              onClick={handleComplete} 
              disabled={isCompleting || !actualTimeframe}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isCompleting ? 'Completing...' : 'Complete Bold Action'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

