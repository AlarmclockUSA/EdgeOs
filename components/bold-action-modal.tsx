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
      const boldActionRef = doc(db, 'boldActions', boldAction.id)
      await setDoc(boldActionRef, {
        status: 'completed',
        completedAt: new Date(),
        actualTimeframe,
        reflectionNotes: reflectionNotes.trim() || null
      }, { merge: true })

      await updateDoc(doc(db, 'users', user.uid), {
        completedBoldActions: increment(1)
      })

      toast({
        title: "Bold Action Completed",
        description: "Your bold action has been marked as completed.",
      })

      onComplete(boldAction.id)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bold Action Details</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>{boldAction.action}</p>
              <p className="text-sm text-muted-foreground">Expected timeframe: {boldAction.timeframe}</p>
              <p className="text-sm text-muted-foreground">
                Created on: {formatDate(boldAction.createdAt)}
              </p>
              {boldAction.status === 'completed' && (
                <p className="text-sm text-muted-foreground">
                  Completed on: {formatDate(boldAction.completedAt)}
                </p>
              )}
            </div>
          </DialogDescription>

          {boldAction.status === 'completed' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Actual Timeframe</Label>
                <p className="text-sm">{boldAction.actualTimeframe}</p>
              </div>
              {boldAction.reflectionNotes && (
                <div className="space-y-2">
                  <Label>Reflection Notes</Label>
                  <p className="text-sm whitespace-pre-wrap">{boldAction.reflectionNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="actualTimeframe" className="text-sm font-medium">
                  Actual Timeframe to Complete
                </Label>
                <Select value={actualTimeframe} onValueChange={setActualTimeframe}>
                  <SelectTrigger id="actualTimeframe">
                    <SelectValue placeholder="Select actual timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Less than 1 Week">Less than 1 Week</SelectItem>
                    <SelectItem value="1 Week">1 Week</SelectItem>
                    <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                    <SelectItem value="3 Weeks">3 Weeks</SelectItem>
                    <SelectItem value="4+ Weeks">4+ Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reflectionNotes" className="text-sm font-medium">
                  Reflection Notes (Optional)
                </Label>
                <Textarea
                  id="reflectionNotes"
                  placeholder="Share your thoughts on completing this bold action..."
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {boldAction.status === 'active' && (
            <Button 
              onClick={handleComplete} 
              disabled={isCompleting || !actualTimeframe}
            >
              {isCompleting ? 'Completing...' : 'Complete Bold Action'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

